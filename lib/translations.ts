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
  'caterpie': 'Para se proteger, libera um fedor horrível de suas antenas, com o qual repele seus inimigos.',
  'metapod': 'Mesmo tendo um corpo duro como aço, um impacto forte pode expor seu interior frágil.',
  'butterfree': 'Tem uma habilidade superior de encontrar flores deliciosas. Pode procurar, extrair e carregar mel de flores.',
  'weedle': 'Muitas vezes encontrado em florestas, comendo folhas. Tem um ferrão venenoso afiado na cabeça.',
  'kakuna': 'Quase incapaz de se mover, este Pokémon só pode endurecer sua concha para se proteger.',
  'beedrill': 'Voa a alta velocidade e ataca usando os grandes ferrões venenosos em suas patas dianteiras e cauda.',
  'pidgey': 'Um Pokémon muito dócil. Se atacado, geralmente afasta areia com suas asas em vez de lutar.',
  'pidgeotto': 'Muito protetor de seu amplo território, este Pokémon atacará ferozmente qualquer intruso.',
  'pidgeot': 'Quando caça, voa rasante sobre a superfície da água a alta velocidade para agarrar presas descuidadas.',
  'rattata': 'Morde qualquer coisa quando ataca. Ratinhos pequenos e rápidos que são vistos em muitos lugares.',
  'raticate': 'Seus pés traseiros robustos permitem que ele se mova de forma ágil. Ataca ferozmente com seus enormes dentes.',
  'pikachu': 'Quando vários destes Pokémon se reúnem, sua eletricidade pode causar tempestades de raios.',
  'raichu': 'Sua cauda longa serve como um para-raios. Ele se protege plantando a cauda no chão.',
  'sandshrew': 'Cava tocas profundas. Vive cavando o solo, procurando pedras para comer.',
  'sandslash': 'Se enrola em uma bola para se proteger. Pode rolar para atacar ou escapar.',
  'nidoran-f': 'Embora pequena, deve ser tratada com cautela por causa de suas farpas venenosas.',
  'nidoran-m': 'Agita suas orelhas grandes para verificar os arredores. Se sentir perigo, ataca com um chifre venenoso.',
  'clefairy': 'Adorável e raro. Muito procurado por sua aparência fofa e natureza dócil.',
  'vulpix': 'Ao nascer, tem apenas uma cauda branca. A cauda se divide enquanto cresce.',
  'ninetales': 'Muito inteligente e vingativo. Agarrar uma de suas muitas caudas pode resultar em uma maldição de 1.000 anos.',
  'jigglypuff': 'Quando seus olhos grandes se iluminam, canta uma melodia misteriosa que faz todos dormirem.',
  'zubat': 'Forma colônias em cavernas escuras. Usa ondas ultrassônicas para detectar obstáculos.',
  'oddish': 'Durante o dia, se enterra no solo. À noite, vagueia plantando sementes.',
  'meowth': 'Adora objetos redondos. Vagueia pelas ruas todas as noites para procurar moedas perdidas.',
  'psyduck': 'Enquanto acalma seu inimigo com seu olhar vazio, este astuto Pokémon usará poderes psicoquinéticos.',
  'growlithe': 'Muito leal e protetor. Latirá ferozmente para qualquer um que se aproxime de seu território.',
  'arcanine': 'Um Pokémon lendário na China. Muitas pessoas são cativadas por sua corrida graciosa e elegante.',
  'poliwag': 'Sua pele é tão fina que seus órgãos internos são visíveis. Tem dificuldade de andar sobre suas pernas.',
  'abra': 'Dorme 18 horas por dia. Usa vários poderes psíquicos mesmo enquanto dorme.',
  'kadabra': 'Emite ondas alfa especiais de seu corpo que induzem dores de cabeça em quem está por perto.',
  'alakazam': 'Seu cérebro pode superar um supercomputador. Seu QI é de aproximadamente 5.000.',
  'machop': 'Adora construir seus músculos. Treina em todas as artes marciais para se tornar ainda mais forte.',
  'machoke': 'Seu corpo musculoso é tão poderoso que precisa usar um cinto especial para conter sua força.',
  'machamp': 'Usando seus quatro braços musculosos, pode dar 1.000 socos em dois segundos.',
  'tentacool': 'Seu corpo é quase inteiramente composto de água. Absorve luz solar e a refrata com a água em seu corpo.',
  'geodude': 'Encontrado em campos e montanhas. Confundido com uma pedra, as pessoas tropeçam nele ou o pisam.',
  'ponyta': 'Suas patas são mais fortes do que parecem. Pode saltar montanhas com facilidade.',
  'slowpoke': 'Incrivelmente lento e preguiçoso. Leva 5 segundos para sentir dor quando está sob ataque.',
  'magnemite': 'Usa ondas anti-gravidade para flutuar. Aparece quando há eletricidade.',
  'farfetchd': 'Sempre visto carregando um talo de alho-poró. Luta com o talo como se fosse uma espada.',
  'doduo': 'Uma espécie de pássaro que possui duas cabeças. As duas cabeças possuem cérebros idênticos.',
  'seel': 'Esse Pokémon adora nadar em águas geladas. É coberto por pelo branco e grosso.',
  'grimer': 'Aparece em águas sujas. Composto de lodo, é imune a qualquer veneno.',
  'shellder': 'Protegido por uma concha dura. Os misteriosos conteúdos de dentro nunca foram vistos.',
  'gastly': 'Quase invisível, este Pokémon gasoso envolve inimigos e os faz adormecer sem aviso.',
  'haunter': 'Sua língua é feita de gás. Se lambido, a vítima começa a tremer constantemente até a morte.',
  'gengar': 'Se esconde nas sombras. Diz-se que a temperatura cai quando Gengar está próximo.',
  'onix': 'À medida que cresce, as partes de pedra endurecem para se tornarem semelhantes a diamantes negros.',
  'drowzee': 'Coloca inimigos para dormir e depois come seus sonhos. Ocasionalmente adoece de pesadelos.',
  'hypno': 'Quando olha para seus inimigos, usa uma mistura de movimentos de pêndulo e ondas cerebrais para hipnotizar.',
  'krabby': 'Se perder uma pata, pode regenerá-la rapidamente. Suas garras são suas principais armas de ataque.',
  'voltorb': 'Parece uma Poké Ball. É perigoso pois pode explodir sem aviso.',
  'exeggcute': 'Embora se pareça com ovos, na verdade é mais parecido com sementes de plantas.',
  'cubone': 'Usa o crânio de sua mãe falecida como capacete. Sua aparência triste o tornou muito solitário.',
  'marowak': 'Supera a tristeza pela mãe para se tornar um lutador resistente. É forte e rápido com seu osso.',
  'hitmonlee': 'Quando está em ação, suas pernas podem se esticar para quase o dobro do comprimento normal.',
  'hitmonchan': 'Seus socos são tão rápidos que são imperceptíveis. Treina como um boxeador profissional.',
  'lickitung': 'Sua língua pode se estender como a de um camaleão. Quando lambe inimigos, eles ficam paralisados.',
  'koffing': 'Seu corpo está cheio de gás venenoso que vaza por pequenos poros, causando um cheiro terrível.',
  'rhyhorn': 'Corre em linha reta, destruindo tudo em seu caminho. Não se preocupa em mudar de direção.',
  'chansey': 'Muito raro e difícil de capturar. Diz-se que traz felicidade a quem consegue capturá-lo.',
  'tangela': 'O corpo inteiro está coberto por videiras azuis. As videiras se mexem quando caminha.',
  'kangaskhan': 'Cria seus filhotes em uma bolsa na barriga. Não ficará parado se seu filhote estiver em perigo.',
  'horsea': 'Se sentir perigo, expele tinta preta automaticamente. Vive em mares calmos.',
  'goldeen': 'Suas nadadeiras caudais acenam graciosamente como um vestido elegante na água.',
  'staryu': 'Mesmo se seu corpo for destruído, pode se regenerar se o núcleo central permanecer intacto.',
  'mr-mime': 'Especialista em pantomima. Cria barreiras invisíveis com seus dedos que realmente existem.',
  'scyther': 'Incrivelmente rápido. Suas lâminas afiadas podem cortar troncos grossos de árvores.',
  'jynx': 'Caminha ritmicamente, balançando e agitando os quadris como se estivesse dançando.',
  'electabuzz': 'Comum perto de usinas de energia. Causa grandes blecautes quando aparece em cidades.',
  'magmar': 'Encontrado perto de vulcões. Seu corpo inteiro é coberto por chamas incandescentes.',
  'pinsir': 'Seus chifres poderosos podem esmagar qualquer coisa. O que não pode esmagar, arremessa longe.',
  'tauros': 'Quando não encontra oponentes, derruba árvores grossas para se acalmar.',
  'magikarp': 'Famoso por ser confiável, mas também incrivelmente fraco. Pode ser encontrado em qualquer corpo de água.',
  'gyarados': 'Extremamente raro. Conhecido por destruir cidades inteiras em sua fúria quando aparece.',
  'lapras': 'Gentil e inteligente. Pode transportar pessoas sobre a água. É uma espécie em perigo de extinção.',
  'ditto': 'Capaz de reorganizar sua estrutura celular para se transformar em outras formas de vida.',
  'eevee': 'Sua composição genética é irregular. Pode sofrer mutações se exposto à radiação de pedras elementais.',
  'vaporeon': 'Vive perto da água. Sua cauda tem uma barbatana que é frequentemente confundida com a de uma sereia.',
  'jolteon': 'Cada pelo em seu corpo é afiado como uma agulha. Pelos agitados disparam como uma chuva de flechas.',
  'flareon': 'Armazena ar quente em seu corpo. Sua temperatura corporal pode chegar a 900°C.',
  'porygon': 'Um Pokémon feito inteiramente de código de programação. Pode se mover livremente no ciberespaço.',
  'omanyte': 'Um Pokémon pré-histórico que vivia no fundo do mar. Ressuscitado de um fóssil.',
  'kabuto': 'Um Pokémon que foi regenerado de um fóssil encontrado em uma formação rochosa de 300 milhões de anos.',
  'aerodactyl': 'Um Pokémon pré-histórico feroz. Regenerado a partir de material genético extraído de âmbar.',
  'snorlax': 'Muito preguiçoso. Só se move para comer e dormir. À medida que seu corpo cresce, torna-se cada vez mais preguiçoso.',
  'articuno': 'Um Pokémon pássaro lendário. Congela a água contida no ar para criar neve enquanto voa.',
  'zapdos': 'Um Pokémon pássaro lendário que aparece quando nuvens de tempestade cobrem o céu.',
  'moltres': 'Um Pokémon pássaro lendário. Dizem que sua aparição indica a chegada da primavera.',
  'dratini': 'Há muito tempo considerado mítico. Um pequeno número foi encontrado vivendo debaixo d\'água.',
  'dragonair': 'Um Pokémon místico que pode controlar o clima. Vive em lagos e rios cristalinos.',
  'dragonite': 'Um Pokémon marinho que voa livremente. Diz-se que em algum lugar do oceano existe uma ilha onde estes se reúnem.',
  'mewtwo': 'Foi criado por um cientista após anos de experimentos horríveis de engenharia genética.',
  'mew': 'Quando visto através de um microscópio, o cabelo curto, fino e delicado deste Pokémon pode ser observado.',
  // Gen 2 populares
  'chikorita': 'Uma doce fragrância flutua gentilmente da folha em sua cabeça. É dócil e adora tomar sol.',
  'cyndaquil': 'É tímido e sempre se enrola em uma bola. Se assustado, as chamas em suas costas queimam mais vigorosamente.',
  'totodile': 'Suas mandíbulas poderosas são capazes de esmagar qualquer coisa. Mesmo seu treinador deve ter cuidado.',
  'togepi': 'A concha parece estar cheia de alegria. Diz-se que traz boa sorte a quem o trata com carinho.',
  'ampharos': 'A ponta de sua cauda brilha tão forte que pode ser vista do espaço. Na antiguidade, era usado como farol.',
  'espeon': 'Ao prever os movimentos do inimigo com a fina pelagem que cobre seu corpo, pode contra-atacar.',
  'umbreon': 'Quando exposto à luz da lua, os anéis em seu corpo brilham com um tom dourado misterioso.',
  'murkrow': 'Temido e detestado por muitos. É amplamente acreditado que traz infortúnio a quem o vê à noite.',
  'scizor': 'Balança suas pinças como se fossem olhos para assustar inimigos. Suas garras são de aço.',
  'heracross': 'Adora comer mel doce. Para localizar colmeias, voa pelos campos e florestas.',
  'houndoom': 'Nas trevas, as chamas em suas costas brilham sinistramente. É temido como o cão do inferno.',
  'larvitar': 'Nascido no subsolo, deve comer seu caminho através da terra para ver a superfície.',
  'tyranitar': 'Tão incrivelmente poderoso que pode derrubar uma montanha inteira para fazer seu ninho.',
  'lugia': 'Diz-se que é o guardião dos mares. Uma leve batida de suas asas pode causar tempestades de 40 dias.',
  'ho-oh': 'Suas penas brilham em sete cores dependendo do ângulo em que a luz as atinge. Traz felicidade.',
  'celebi': 'Este Pokémon viaja pelo tempo. Grama e árvores florescem nos locais por onde ele passa.',
  // Gen 3 populares
  'treecko': 'Pequeno mas ágil. As almofadas de seus pés permitem escalar superfícies verticais com facilidade.',
  'torchic': 'Uma bola de fogo quente vive dentro de seu corpo. Se abraçado, é maravilhosamente quente.',
  'mudkip': 'As barbatanas em suas bochechas funcionam como um radar sensível, permitindo detectar movimentos na água.',
  'gardevoir': 'Para proteger seu treinador, usa toda a sua energia psíquica para criar um pequeno buraco negro.',
  'ralts': 'É muito sensível às emoções das pessoas. Se sentir hostilidade, se esconde.',
  'absol': 'Cada vez que Absol aparece diante das pessoas, é seguido por um desastre como um terremoto ou tsunami.',
  'salamence': 'Como resultado de seu desejo eterno de voar, finalmente desenvolveu asas imensas.',
  'metagross': 'Tem um cérebro formado por quatro interligados. É mais inteligente que um supercomputador.',
  'rayquaza': 'Vive na camada de ozônio acima das nuvens. Não é visto da superfície terrestre.',
  'groudon': 'Diz-se que é a personificação da terra. Lendas contam sua luta com Kyogre.',
  'kyogre': 'Diz-se que é a personificação do oceano. Lendas contam sua luta com Groudon.',
  // Gen 4 populares
  'lucario': 'Um Pokémon que controla a aura. Pode sentir e manipular a energia vital de todas as coisas.',
  'garchomp': 'Voa a velocidades sônicas. Nunca deixa escapar sua presa quando ataca.',
  'dialga': 'Pokémon lendário com o poder de controlar o tempo. Aparece em mitos como uma divindade antiga.',
  'palkia': 'Pokémon lendário com a habilidade de distorcer o espaço. É descrito como uma divindade em mitos.',
  'giratina': 'Aparece em cemitérios. Vive em um mundo reverso onde as regras comuns não se aplicam.',
  'darkrai': 'Pode fazer as pessoas dormirem e ter pesadelos terríveis. É ativo nas noites de lua nova.',
  'arceus': 'Diz-se que emergiu de um ovo no nada e então moldou o mundo com seus mil braços.',
};

export function translateDescription(pokemonName: string, originalDescription: string): string {
  const name = pokemonName.toLowerCase().trim();
  
  // Se temos tradução manual, usar ela (prioridade máxima)
  if (pokemonDescriptions[name]) {
    return pokemonDescriptions[name];
  }
  
  // Retornar a descrição vinda da API (já tratada para ser PT ou EN, sem espanhol)
  return originalDescription;
}
