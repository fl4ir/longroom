import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './SearchBar.css';

export default function SearchBar() {
  const { state, actions } = useApp();
  const [inputValue, setInputValue] = useState(state.searchFilters.query);
  
  const handleSearch = (query: string) => {
    setInputValue(query);
    actions.setSearchFilters({
      ...state.searchFilters,
      query
    });
  };
  
  const clearSearch = () => {
    setInputValue('');
    actions.setSearchFilters({
      ...state.searchFilters,
      query: ''
    });
  };
  
  return (
    <div className="search-bar">
      <div className="search-input-container">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Rechercher par nom, ingrédient ou utilisation..."
          value={inputValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
        {inputValue && (
          <button
            type="button"
            onClick={clearSearch}
            className="clear-search-button"
            title="Effacer la recherche"
          >
            <X />
          </button>
        )}
      </div>
    </div>
  );
}
