// Traduções para Português BR

export const pokemonTypes: Record<string, string> = {
  normal: 'Normal',
  fire: 'Fogo',
  water: 'Água',
  electric: 'Elétrico',
  grass: 'Planta',
  ice: 'Gelo',
  fighting: 'Lutador',
  poison: 'Veneno',
  ground: 'Terra',
  flying: 'Voador',
  psychic: 'Psíquico',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  dragon: 'Dragão',
  dark: 'Sombrio',
  steel: 'Metálico',
  fairy: 'Fada',
};

export const pokemonStats: Record<string, string> = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'Ataque Especial',
  'special-defense': 'Defesa Especial',
  speed: 'Velocidade',
};

export const variantNames: Record<string, string> = {
  shiny: 'Brilhante',
  costume: 'Traje',
  background: 'Fundo',
  purified: 'Purificado',
};

export function translateType(type: string): string {
  return pokemonTypes[type.toLowerCase()] || type;
}

export function translateStat(stat: string): string {
  return pokemonStats[stat.toLowerCase()] || stat;
}

export function translateVariant(variant: string): string {
  return variantNames[variant.toLowerCase()] || variant;
}

export function capitalizePokemonName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Traduções manuais de descrições comuns
export const pokemonDescriptions: Record<string, string> = {
  'bulbasaur': 'Há uma semente de planta em suas costas desde o nascimento. A semente cresce lentamente.',
  'ivysaur': 'Quando o bulbo em suas costas cresce, parece perder a capacidade de ficar sobre as patas traseiras.',
  'venusaur': 'A planta floresce quando absorve energia solar. Ela permanece em movimento para buscar luz solar.',
  'charmander': 'Obviamente prefere lugares quentes. Quando chove, diz-se que vapor sai da ponta de sua cauda.',
  'charmeleon': 'Quando balança sua cauda em chamas, ela eleva gradualmente a temperatura ao seu redor para níveis insuportáveis.',
  'charizard': 'Cospe fogo que é quente o suficiente para derreter pedregulhos. Pode causar incêndios florestais ao soprar chamas.',
  'squirtle': 'Após o nascimento, suas costas incham e endurecem em uma concha. Lança espuma poderosamente de sua boca.',
  'wartortle': 'É reconhecido como um símbolo de longevidade. Se sua concha tem algas, esse Wartortle é muito velho.',
  'blastoise': 'Um Pokémon brutal com jatos de água pressurizados em sua concha. Eles são usados para ataques de alta velocidade.',
  'pikachu': 'Quando vários destes Pokémon se reúnem, sua eletricidade pode causar tempestades de raios.',
  'raichu': 'Sua cauda longa serve como um para-raios. Ele se protege plantando a cauda no chão.',
  'meowth': 'Adora objetos redondos. Vagueia pelas ruas todas as noites para procurar moedas perdidas.',
  'psyduck': 'Enquanto acalma seu inimigo com seu olhar vazio, este astuto Pokémon usará poderes psicoquinéticos.',
  'machop': 'Adora construir seus músculos. Treina em todas as artes marciais para se tornar ainda mais forte.',
  'geodude': 'Encontrado em campos e montanhas. Confundido com uma pedra, as pessoas tropeçam nele ou o pisam.',
  'gastly': 'Quase invisível, este Pokémon gasoso envolve inimigos e os faz adormecer sem aviso.',
  'onix': 'À medida que cresce, as partes de pedra endurecem para se tornarem semelhantes a diamantes negros.',
  'eevee': 'Sua composição genética é irregular. Pode sofrer mutações se exposto à radiação de pedras elementais.',
  'snorlax': 'Muito preguiçoso. Só se move para comer e dormir. À medida que seu corpo cresce, torna-se cada vez mais preguiçoso.',
  'dratini': 'Há muito tempo considerado mítico. Um pequeno número foi encontrado vivendo debaixo d\'água.',
  'dragonite': 'Um Pokémon marinho que voa livremente. Diz-se que em algum lugar do oceano existe uma ilha onde estes se reúnem.',
  'mewtwo': 'Foi criado por um cientista após anos de experimentos horríveis de engenharia genética.',
  'mew': 'Quando visto através de um microscópio, o cabelo curto, fino e delicado deste Pokémon pode ser observado.',
};

export function translateDescription(pokemonName: string, originalDescription: string): string {
  const name = pokemonName.toLowerCase().trim();
  
  // Se temos tradução manual, usar ela
  if (pokemonDescriptions[name]) {
    return pokemonDescriptions[name];
  }
  
  // Se a descrição já está em português (não contém palavras comuns em inglês), retornar como está
  const englishWords = ['the', 'when', 'its', 'this', 'that', 'with', 'from', 'they', 'their', 'have', 'been', 'were', 'said', 'what', 'which'];
  const hasEnglish = englishWords.some(word => 
    originalDescription.toLowerCase().includes(` ${word} `) || 
    originalDescription.toLowerCase().startsWith(`${word} `)
  );
  
  if (!hasEnglish) {
    return originalDescription;
  }
  
  // Retornar com nota de tradução não disponível
  return originalDescription;
}
