'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Filtros de variantes especiais
export interface VariantFilters {
  is_shiny: boolean | null;
  has_costume: boolean | null;
  has_background: boolean | null;
  is_purified: boolean | null;
  is_dynamax: boolean | null;
  is_gigantamax: boolean | null;
}

// Filtros de preço
export interface PriceFilter {
  min: number | null;
  max: number | null;
}

// Contexto completo de busca
export interface SearchFilters {
  query: string;
  category: string | null;
  variants: VariantFilters;
  price: PriceFilter;
  sortBy: 'recent' | 'price_asc' | 'price_desc' | 'popular';
}

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  filters: SearchFilters;
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

const defaultFilters: SearchFilters = {
  query: '',
  category: null,
  variants: {
    is_shiny: null,
    has_costume: null,
    has_background: null,
    is_purified: null,
    is_dynamax: null,
    is_gigantamax: null,
  },
  price: {
    min: null,
    max: null,
  },
  sortBy: 'recent',
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFiltersState] = useState<SearchFilters>(defaultFilters);

  const clearSearch = () => {
    setSearchQuery('');
    setFiltersState(prev => ({ ...prev, query: '' }));
  };

  const setFilters = (newFilters: Partial<SearchFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    if (newFilters.query !== undefined) {
      setSearchQuery(newFilters.query);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFiltersState(defaultFilters);
  };

  // Verificar se há filtros ativos além da busca
  const hasActiveFilters =
    filters.category !== null ||
    Object.values(filters.variants).some(v => v !== null) ||
    filters.price.min !== null ||
    filters.price.max !== null ||
    filters.sortBy !== 'recent';

  return (
    <SearchContext.Provider value={{
      searchQuery,
      setSearchQuery,
      clearSearch,
      filters,
      setFilters,
      resetFilters,
      hasActiveFilters,
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
