'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  searchPokemon,
  getAllPokemonList,
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
    const pokemon = await getAllPokemonList();
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
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
            className="pl-10 border-2 border-poke-blue/30 focus:border-poke-blue transition-colors"
          />
        </div>
        <Button
          type="button"
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

        <div className="relative">
          {/* Botões de Navegação - Visíveis em desktop */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => { e.preventDefault(); scroll('left'); }}
            className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 bg-card/95 hover:bg-card shadow-xl border-2 border-poke-blue/20 opacity-90 pointer-events-auto"
          >
            <ChevronLeft className="h-5 w-5 text-poke-blue" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => { e.preventDefault(); scroll('right'); }}
            className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-card/95 hover:bg-card shadow-xl border-2 border-poke-blue/20 opacity-90 pointer-events-auto"
          >
            <ChevronRight className="h-5 w-5 text-poke-blue" />
          </Button>

          <p className="mb-2 text-xs text-muted-foreground">
            Arraste horizontalmente para ver mais Pokémons ou use as setas laterais.
          </p>

          <div
            ref={scrollContainerRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto scroll-smooth py-3 px-8 sm:px-10 touch-pan-x snap-x snap-mandatory"
            style={{
              scrollbarWidth: 'thin',
              msOverflowStyle: 'auto',
            }}
          >
            {displayList.map((pokemon) => (
              <button
                key={pokemon.id}
                onClick={() => handleSelectPokemon(pokemon)}
                disabled={loading}
                className="flex-shrink-0 snap-start w-24 sm:w-28 flex flex-col items-center p-2 sm:p-3 rounded-xl border-2 border-border active:border-poke-blue hover:border-poke-blue hover:shadow-xl transition-all bg-gradient-to-br from-card to-muted dark:from-card dark:to-muted/50 sm:hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-poke-blue/10 rounded-full blur-md"></div>
                  <img
                    src={pokemon.sprite}
                    alt={pokemon.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain relative z-10"
                    loading="lazy"
                    onError={(event) => {
                      const target = event.currentTarget;
                      const stage = parseInt(target.dataset.fallback || '0', 10);
                      const defaultSpriteSrc = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
                      const officialArtworkSrc = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
                      const fallbackSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
                          <rect width="96" height="96" rx="16" fill="#111827"/>
                          <circle cx="48" cy="48" r="26" fill="#ef4444"/>
                          <path d="M22 48h52" stroke="#f8fafc" stroke-width="8"/>
                          <circle cx="48" cy="48" r="10" fill="#f8fafc"/>
                          <circle cx="48" cy="48" r="5" fill="#111827"/>
                        </svg>`
                      )}`;

                      if (stage === 0) {
                        target.dataset.fallback = '1';
                        target.src = defaultSpriteSrc;
                      } else if (stage === 1) {
                        target.dataset.fallback = '2';
                        target.src = officialArtworkSrc;
                      } else {
                        target.dataset.fallback = '3';
                        target.src = fallbackSvg;
                      }
                    }}
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
