/**
 * PokéAPI Integration Service
 * 
 * Provides functions to fetch Pokémon data from the free PokéAPI
 * Documentation: https://pokeapi.co/docs/v2
 */

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

export interface PokemonBasicInfo {
  id: number;
  name: string;
  sprite: string;
}

export interface PokemonType {
  slot: number;
  type: {
    name: string;
    url: string;
  };
}

export interface PokemonAbility {
  ability: {
    name: string;
    url: string;
  };
  is_hidden: boolean;
  slot: number;
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

export interface PokemonDetails {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  sprites: {
    front_default: string;
    front_shiny: string;
    other: {
      'official-artwork': {
        front_default: string;
      };
      home: {
        front_default: string;
        front_shiny: string;
      };
    };
  };
  types: PokemonType[];
  abilities: PokemonAbility[];
  stats: PokemonStat[];
}

export interface PokemonSpecies {
  id: number;
  name: string;
  color: {
    name: string;
  };
  habitat: {
    name: string;
  } | null;
  generation: {
    name: string;
  };
  flavor_text_entries: Array<{
    flavor_text: string;
    language: {
      name: string;
    };
  }>;
}

/**
 * Search Pokémon by name or ID
 */
export async function searchPokemon(query: string): Promise<PokemonBasicInfo[]> {
  try {
    const searchQuery = query.toLowerCase().trim();
    
    // If it's a number, search by ID
    if (!isNaN(Number(searchQuery))) {
      const pokemon = await getPokemonById(Number(searchQuery));
      if (pokemon) {
        return [{
          id: pokemon.id,
          name: pokemon.name,
          sprite: pokemon.sprites.front_default
        }];
      }
      return [];
    }
    
    // Otherwise, search by name
    const response = await fetch(`${POKEAPI_BASE_URL}/pokemon/${searchQuery}`);
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return [{
      id: data.id,
      name: data.name,
      sprite: data.sprites.front_default
    }];
  } catch (error) {
    console.error('Error searching Pokémon:', error);
    return [];
  }
}

/**
 * Get list of all Pokémon (paginated)
 */
export async function getPokemonList(limit: number = 20, offset: number = 0): Promise<PokemonBasicInfo[]> {
  try {
    const response = await fetch(`${POKEAPI_BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
    if (!response.ok) {
      throw new Error('Failed to fetch Pokémon list');
    }
    
    const data = await response.json();
    
    // Fetch details for each Pokémon to get sprites
    const pokemonPromises = data.results.map(async (pokemon: any) => {
      const detailsResponse = await fetch(pokemon.url);
      const details = await detailsResponse.json();
      return {
        id: details.id,
        name: details.name,
        sprite: details.sprites.front_default
      };
    });
    
    return await Promise.all(pokemonPromises);
  } catch (error) {
    console.error('Error fetching Pokémon list:', error);
    return [];
  }
}

/**
 * Get detailed Pokémon information by ID
 */
export async function getPokemonById(id: number): Promise<PokemonDetails | null> {
  try {
    const response = await fetch(`${POKEAPI_BASE_URL}/pokemon/${id}`);
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Pokémon details:', error);
    return null;
  }
}

/**
 * Get detailed Pokémon information by name
 */
export async function getPokemonByName(name: string): Promise<PokemonDetails | null> {
  try {
    const response = await fetch(`${POKEAPI_BASE_URL}/pokemon/${name.toLowerCase()}`);
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Pokémon details:', error);
    return null;
  }
}

/**
 * Get Pokémon species information (includes descriptions)
 */
export async function getPokemonSpecies(id: number): Promise<PokemonSpecies | null> {
  try {
    const response = await fetch(`${POKEAPI_BASE_URL}/pokemon-species/${id}`);
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Pokémon species:', error);
    return null;
  }
}

/**
 * Get Pokémon description in Portuguese (if available)
 */
export async function getPokemonDescription(id: number): Promise<string> {
  try {
    const species = await getPokemonSpecies(id);
    if (!species) return '';
    
    // Try to find Portuguese description
    const ptDescription = species.flavor_text_entries.find(
      entry => entry.language.name === 'pt' || entry.language.name === 'pt-BR'
    );
    
    if (ptDescription) {
      return ptDescription.flavor_text.replace(/\f/g, ' ');
    }
    
    // Fallback to English
    const enDescription = species.flavor_text_entries.find(
      entry => entry.language.name === 'en'
    );
    
    return enDescription ? enDescription.flavor_text.replace(/\f/g, ' ') : '';
  } catch (error) {
    console.error('Error fetching Pokémon description:', error);
    return '';
  }
}

/**
 * Get Pokémon type colors for UI
 */
export function getTypeColor(type: string): string {
  const typeColors: { [key: string]: string } = {
    normal: '#A8A878',
    fire: '#F08030',
    water: '#6890F0',
    electric: '#F8D030',
    grass: '#78C850',
    ice: '#98D8D8',
    fighting: '#C03028',
    poison: '#A040A0',
    ground: '#E0C068',
    flying: '#A890F0',
    psychic: '#F85888',
    bug: '#A8B820',
    rock: '#B8A038',
    ghost: '#705898',
    dragon: '#7038F8',
    dark: '#705848',
    steel: '#B8B8D0',
    fairy: '#EE99AC',
  };
  
  return typeColors[type.toLowerCase()] || '#777';
}

/**
 * Format Pokémon name for display
 */
export function formatPokemonName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
