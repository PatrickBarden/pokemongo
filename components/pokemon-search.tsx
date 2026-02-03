'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  searchPokemon,
  getPokemonList,
  getPokemonByName,
  getPokemonDescription,
  getTypeColor,
  formatPokemonName,
  PokemonBasicInfo,
  PokemonDetails,
} from '@/lib/pokeapi';
import { translateType, translateDescription } from '@/lib/translations';

interface PokemonSearchProps {
  onSelect: (pokemon: PokemonDetails, description: string) => void;
}

export function PokemonSearch({ onSelect }: PokemonSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PokemonBasicInfo[]>([]);
  const [popularPokemon, setPopularPokemon] = useState<PokemonBasicInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDetails | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load popular Pokémon on mount
  useEffect(() => {
    loadPopularPokemon();
  }, []);

  const loadPopularPokemon = async () => {
    const pokemon = await getPokemonList(50, 0); // Aumentar para 50 Pokémon
    setPopularPokemon(pokemon);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = scrollContainerRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults = await searchPokemon(query);
    setResults(searchResults);
    setLoading(false);
  };

  const handleSelectPokemon = async (pokemon: PokemonBasicInfo) => {
    setLoading(true);
    const details = await getPokemonByName(pokemon.name);
    if (details) {
      const description = await getPokemonDescription(details.id);
      const translatedDescription = translateDescription(pokemon.name, description);
      setSelectedPokemon(details);
      onSelect(details, translatedDescription);
    }
    setLoading(false);
  };

  const displayList = results.length > 0 ? results : popularPokemon;

  return (
    <div className="space-y-4">
      {/* Barra de Busca Melhorada */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-poke-blue" />
          <Input
            placeholder="Buscar Pokémon por nome ou número..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 border-2 border-poke-blue/30 focus:border-poke-blue transition-colors"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={loading}
          className="w-full sm:w-auto bg-gradient-to-r from-poke-blue to-poke-yellow hover:opacity-90 transition-opacity"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </>
          )}
        </Button>
      </div>

      {/* Pokémon Selecionado - Card Melhorado */}
      {selectedPokemon && (
        <Card className="border-2 border-poke-blue shadow-lg bg-gradient-to-br from-card to-poke-blue/10 dark:from-card dark:to-poke-blue/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-poke-yellow/20 rounded-full blur-xl"></div>
                <img
                  src={selectedPokemon.sprites.other['official-artwork'].front_default}
                  alt={selectedPokemon.name}
                  className="w-24 h-24 object-contain relative z-10"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-poke-yellow" />
                  <h3 className="text-xl font-bold text-foreground">
                    {formatPokemonName(selectedPokemon.name)}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    #{selectedPokemon.id.toString().padStart(3, '0')}
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  {selectedPokemon.types.map((type) => (
                    <Badge
                      key={type.slot}
                      style={{
                        backgroundColor: getTypeColor(type.type.name),
                        color: 'white',
                      }}
                      className="shadow-md"
                    >
                      {translateType(type.type.name).toUpperCase()}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-3">
                  <span>📏 {selectedPokemon.height / 10}m</span>
                  <span>⚖️ {selectedPokemon.weight / 10}kg</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Carrossel de Pokémon */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-poke-yellow" />
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
            {results.length > 0 ? 'Resultados da Busca' : 'Pokémon Populares'}
          </h3>
          <Badge variant="outline" className="ml-auto">
            {displayList.length} Pokémon
          </Badge>
        </div>

        <div className="relative group">
          {/* Botões de Navegação - Ocultos em mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            className="hidden sm:block absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-card hover:bg-card shadow-xl border-2 border-poke-blue/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
          >
            <ChevronLeft className="h-5 w-5 text-poke-blue" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            className="hidden sm:block absolute -right-4 top-1/2 -translate-y-1/2 z-20 bg-card hover:bg-card shadow-xl border-2 border-poke-blue/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
          >
            <ChevronRight className="h-5 w-5 text-poke-blue" />
          </Button>

          {/* Container do Carrossel com padding para não cortar hover */}
          <div
            ref={scrollContainerRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide scroll-smooth py-3 px-1 -mx-1 touch-pan-x"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {displayList.map((pokemon) => (
              <button
                key={pokemon.id}
                onClick={() => handleSelectPokemon(pokemon)}
                disabled={loading}
                className="flex-shrink-0 w-24 sm:w-28 flex flex-col items-center p-2 sm:p-3 rounded-xl border-2 border-border active:border-poke-blue hover:border-poke-blue hover:shadow-xl transition-all bg-gradient-to-br from-card to-muted dark:from-card dark:to-muted/50 sm:hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-poke-blue/10 rounded-full blur-md"></div>
                  <img
                    src={pokemon.sprite}
                    alt={pokemon.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain relative z-10"
                  />
                </div>
                <span className="text-xs font-semibold text-center mt-2 text-foreground line-clamp-1">
                  {formatPokemonName(pokemon.name)}
                </span>
                <span className="text-xs text-poke-blue font-mono">
                  #{pokemon.id.toString().padStart(3, '0')}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {results.length === 0 && query && !loading && (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum Pokémon encontrado. Tente outro nome ou número.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
