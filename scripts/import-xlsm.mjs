import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const DEFAULT_INPUT = 'C:/Users/emile/Desktop/projets/mateoapp/Mine d\'or oui.xlsm';
const DEFAULT_OUTPUT = './data/imported-recipes.json';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = toText(value).replace(',', '.').replace(/[^0-9.\-]/g, '');
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if ((token === '--input' || token === '-i') && next) {
      args.input = next;
      i += 1;
    } else if ((token === '--output' || token === '-o') && next) {
      args.output = next;
      i += 1;
    }
  }

  return args;
}

function isLikelyMetaSheet(name) {
  const n = normalize(name);
  return (
    n.includes('sommaire') ||
    n.includes('allergene') ||
    n.includes('erreur') ||
    n.includes('modele') ||
    n.includes('menu') ||
    n.includes('template')
  );
}

function extractLinkedSheetNameFromTarget(target) {
  if (!target || typeof target !== 'string') {
    return '';
  }

  const cleaned = target.startsWith('#') ? target.slice(1) : target;
  const beforeBang = cleaned.split('!')[0] || '';
  return beforeBang.replace(/^'+|'+$/g, '').trim();
}

function getSheetCellText(sheet, rowIndex, columnIndex) {
  const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
  const cell = sheet[address];
  return toText(cell?.v ?? cell?.w ?? '');
}

function detectTrustedSummaryTag(sheet, linkRow, linkColumn) {
  const candidates = [];

  for (let row = Math.max(0, linkRow - 18); row <= linkRow; row += 1) {
    for (let col = Math.max(0, linkColumn - 12); col <= linkColumn + 2; col += 1) {
      const text = getSheetCellText(sheet, row, col);
      const normalized = normalize(text);

      if (!normalized) {
        continue;
      }

      let masterTag = '';
      if (normalized.includes('preparation') && normalized.includes('sucree')) {
        masterTag = 'Sucré';
      } else if (normalized.includes('preparation') && normalized.includes('salee')) {
        masterTag = 'Salé';
      } else if (normalized.includes('boisson')) {
        masterTag = 'Boisson';
      }

      if (!masterTag) {
        continue;
      }

      const rowDistance = Math.max(0, linkRow - row);
      const colDistance = Math.abs(linkColumn - col);
      const score = rowDistance * 5 + colDistance;
      candidates.push({ masterTag, score });
    }
  }

  candidates.sort((a, b) => a.score - b.score);
  return candidates[0]?.masterTag || '';
}

function extractSummaryMetadata(workbook) {
  const summarySheetName = workbook.SheetNames.find((name) => normalize(name).includes('sommaire'));
  if (!summarySheetName) {
    return new Map();
  }

  const summarySheet = workbook.Sheets[summarySheetName];
  const metadataBySheetName = new Map();

  for (const [address, cell] of Object.entries(summarySheet)) {
    if (address.startsWith('!')) {
      continue;
    }

    const linkedSheetName = extractLinkedSheetNameFromTarget(cell?.l?.Target);
    if (!linkedSheetName || !workbook.SheetNames.includes(linkedSheetName)) {
      continue;
    }

    const { r, c } = XLSX.utils.decode_cell(address);
    const trustedTag = detectTrustedSummaryTag(summarySheet, r, c);
    metadataBySheetName.set(linkedSheetName, {
      masterTag: trustedTag || undefined,
      summaryCell: address,
      summaryLabel: toText(cell?.v ?? cell?.w ?? '')
    });
  }

  return metadataBySheetName;
}

function extractLinkedSheetNames(workbook) {
  const summaryMetadata = extractSummaryMetadata(workbook);
  const linkedNames = new Set();

  for (const sheetName of summaryMetadata.keys()) {
    linkedNames.add(sheetName);
  }

  return Array.from(linkedNames);
}

function findHeaderRow(rows) {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 60); rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const normalizedCells = row.map(normalize);

    const hasRecipe = normalizedCells.some((cell) => cell === 'recette' || cell.includes('recette'));
    const hasIngredient = normalizedCells.some((cell) => cell === 'ingredients' || cell === 'ingredient' || cell.includes('ingredient'));
    const hasQuantity = normalizedCells.some((cell) => cell === 'quantite' || cell.includes('quantite'));

    if (hasRecipe && hasIngredient && hasQuantity) {
      return rowIndex;
    }
  }

  return -1;
}

function mapColumns(headerRow) {
  const normalized = headerRow.map(normalize);
  const findCol = (predicates) => normalized.findIndex((text) => predicates.some((predicate) => predicate(text)));

  return {
    recipe: findCol([(t) => t === 'recette' || t.includes('recette')]),
    totalWeight: findCol([(t) => t.includes('masse totale') || (t.includes('masse') && t.includes('totale'))]),
    ingredient: findCol([(t) => t === 'ingredients' || t === 'ingredient' || t.includes('ingredient')]),
    quantity: findCol([(t) => t === 'quantite' || t.includes('quantite')]),
    unit: findCol([(t) => t === 'unite' || t.includes('unite')]),
    process: findCol([(t) => t === 'processus' || t.includes('processus') || t.includes('procede')]),
    usage: findCol([(t) => t === 'utilite' || t.includes('utilite') || t.includes('usage')]),
    allergens: findCol([(t) => t === 'allergenes' || t.includes('allergene')])
  };
}

function parseRecipeSheet(sheetName, sheet, summaryMetadata) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  const headerRowIndex = findHeaderRow(rows);

  if (headerRowIndex < 0) {
    return [];
  }

  const columns = mapColumns(rows[headerRowIndex]);
  if (columns.ingredient < 0) {
    return [];
  }

  const recipesByName = new Map();
  const ingredientKeysByRecipe = new Map();
  const trustedMasterTag = summaryMetadata?.masterTag;

  let currentRecipeName = '';
  let currentProcess = '';
  let currentUsage = '';
  let currentTotalWeight = 0;

  const getOrCreateRecipe = (recipeName) => {
    const safeName = recipeName || sheetName;
    if (!recipesByName.has(safeName)) {
      recipesByName.set(safeName, {
        id: crypto.randomUUID(),
        name: safeName,
        ingredients: [],
        procedure: '',
        usages: [],
        source: `Import XLSM (${sheetName})`,
        categories: [],
        tags: trustedMasterTag ? [trustedMasterTag] : [],
        allergens: [],
        totalWeight: 0,
        notes: '',
        favorite: false,
        createdAt: new Date().toISOString()
      });
      ingredientKeysByRecipe.set(safeName, new Set());
    }
    return recipesByName.get(safeName);
  };

  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];

    // Stop if we hit a second header row (the 0g calculator table)
    const normalizedRow = row.map(normalize);
    const isSecondHeader =
      normalizedRow.some((c) => c === 'recette' || c.includes('recette')) &&
      normalizedRow.some((c) => c === 'ingredients' || c === 'ingredient' || c.includes('ingredient')) &&
      normalizedRow.some((c) => c === 'quantite' || c.includes('quantite'));
    if (isSecondHeader) {
      break;
    }

    const recipeNameCell = columns.recipe >= 0 ? toText(row[columns.recipe]) : '';
    const processCell = columns.process >= 0 ? toText(row[columns.process]) : '';
    const usageCell = columns.usage >= 0 ? toText(row[columns.usage]) : '';
    const totalWeightCell = columns.totalWeight >= 0 ? toText(row[columns.totalWeight]) : '';

    if (recipeNameCell && normalize(recipeNameCell) !== 'recette') {
      currentRecipeName = recipeNameCell;
    }

    if (processCell && normalize(processCell) !== 'processus') {
      currentProcess = processCell;
    }

    if (usageCell && !normalize(usageCell).includes('utilite')) {
      currentUsage = usageCell;
    }

    if (totalWeightCell && !normalize(totalWeightCell).includes('masse')) {
      currentTotalWeight = toNumber(totalWeightCell);
    }

    const recipe = getOrCreateRecipe(currentRecipeName || sheetName);

    if (currentProcess && !recipe.procedure) {
      recipe.procedure = currentProcess;
    }

    if (currentUsage) {
      const usageParts = currentUsage
        .split(/[;,]+/)
        .map((item) => item.trim())
        .filter(Boolean);

      for (const usage of usageParts) {
        if (!recipe.usages.includes(usage)) {
          recipe.usages.push(usage);
        }
      }
    }

    if (currentTotalWeight > 0 && (!recipe.totalWeight || recipe.totalWeight <= 0)) {
      recipe.totalWeight = currentTotalWeight;
    }

    const ingredientName = columns.ingredient >= 0 ? toText(row[columns.ingredient]) : '';
    const ingredientNormalized = normalize(ingredientName);

    if (ingredientName && ingredientNormalized !== 'ingredients' && ingredientNormalized !== 'ingredient') {
      const quantity = columns.quantity >= 0 ? toNumber(row[columns.quantity]) : 0;
      const unit = columns.unit >= 0 ? toText(row[columns.unit]) : '';
      const ingredientKey = `${normalize(ingredientName)}|${quantity}|${normalize(unit)}`;
      const ingredientKeys = ingredientKeysByRecipe.get(recipe.name);

      if (ingredientKeys && ingredientKeys.has(ingredientKey)) {
        continue;
      }

      recipe.ingredients.push({
        id: crypto.randomUUID(),
        name: ingredientName,
        quantity,
        unit
      });

      if (ingredientKeys) {
        ingredientKeys.add(ingredientKey);
      }
    }

    if (columns.allergens >= 0) {
      const allergenCell = toText(row[columns.allergens]);
      const allergenNormalized = normalize(allergenCell);
      if (allergenCell && !allergenNormalized.includes('allergene')) {
        if (!recipe.allergens.includes(allergenCell)) {
          recipe.allergens.push(allergenCell);
        }
      }
    }
  }

  const recipes = Array.from(recipesByName.values())
    .map((recipe) => {
      if (!recipe.totalWeight || recipe.totalWeight <= 0) {
        const ingredientMass = recipe.ingredients.reduce((sum, ingredient) => sum + (Number(ingredient.quantity) || 0), 0);
        recipe.totalWeight = ingredientMass;
      }
      return recipe;
    })
    .filter((recipe) => recipe.name && recipe.ingredients.length > 0);

  return recipes;
}

function main() {
  const { input, output } = parseArgs(process.argv);

  if (!fs.existsSync(input)) {
    console.error(`Fichier introuvable: ${input}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(input, {
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
    cellNF: false,
    cellText: true,
    cellDates: false
  });

  const summaryMetadataBySheetName = extractSummaryMetadata(workbook);
  const linkedSheetNames = extractLinkedSheetNames(workbook);

  const candidateSheets = (linkedSheetNames.length > 0 ? linkedSheetNames : workbook.SheetNames)
    .filter((name) => !isLikelyMetaSheet(name));

  const allRecipes = [];

  for (const sheetName of candidateSheets) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      continue;
    }

    const recipes = parseRecipeSheet(sheetName, sheet, summaryMetadataBySheetName.get(sheetName));
    if (recipes.length > 0) {
      allRecipes.push(...recipes);
    }
  }

  const dedupedByName = new Map();
  for (const recipe of allRecipes) {
    const key = normalize(recipe.name);
    if (!dedupedByName.has(key)) {
      dedupedByName.set(key, recipe);
    }
  }

  const finalRecipes = Array.from(dedupedByName.values());

  const outputData = {
    generatedAt: new Date().toISOString(),
    sourceFile: input,
    recipeCount: finalRecipes.length,
    recipes: finalRecipes
  };

  const outputPath = path.resolve(process.cwd(), output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

  console.log(`Import termine. ${finalRecipes.length} recettes exportees vers ${outputPath}`);
}

main();
