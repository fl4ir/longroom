// Fonctions utilitaires pour générer des couleurs à partir de chaînes

const CATEGORY_COLORS = [
  '#3B82F6', // bleu
  '#EF4444', // rouge
  '#10B981', // vert
  '#F59E0B', // jaune
  '#8B5CF6', // violet
  '#EC4899', // rose
  '#22C55E', // vert foncé
  '#0EA5E9', // cyan
  '#F97316', // orange
  '#14B8A6'  // turquoise
];

export function stringToColor(value: string): string {
  if (!value) return '#3B82F6';
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
}

export function getContrastingTextColor(background: string): string {
  // Simple luminance calculation to decide between black/white text
  const hex = background.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
