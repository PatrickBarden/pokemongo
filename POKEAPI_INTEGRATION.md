# 🎮 Integração com PokéAPI

## Visão Geral

Este projeto agora está integrado com a **PokéAPI** (https://pokeapi.co), uma API gratuita e completa que fornece dados detalhados sobre Pokémon.

## Características da PokéAPI

- ✅ **Gratuita** - Sem necessidade de autenticação ou chave de API
- ✅ **Completa** - Dados de todos os Pokémon, incluindo stats, habilidades, tipos e imagens
- ✅ **Confiável** - API bem documentada e mantida pela comunidade
- ✅ **Multilíngue** - Suporta descrições em português e outros idiomas

## Arquivos Criados

### 1. `/lib/pokeapi.ts`
Serviço de integração com a PokéAPI contendo:

#### Funções Principais:
- `searchPokemon(query)` - Busca Pokémon por nome ou ID
- `getPokemonList(limit, offset)` - Lista Pokémon com paginação
- `getPokemonById(id)` - Detalhes completos por ID
- `getPokemonByName(name)` - Detalhes completos por nome
- `getPokemonSpecies(id)` - Informações da espécie
- `getPokemonDescription(id)` - Descrição em português (quando disponível)

#### Funções Auxiliares:
- `getTypeColor(type)` - Retorna cor do tipo para UI
- `formatPokemonName(name)` - Formata nome para exibição

### 2. `/components/pokemon-search.tsx`
Componente de busca de Pokémon com:
- Campo de busca por nome ou número
- Grid de Pokémon populares
- Visualização de detalhes ao selecionar
- Auto-preenchimento do formulário

## Como Usar

### Na Página de Cadastro (Wallet)

1. Clique em "Cadastrar Pokémon"
2. Use o campo de busca para encontrar um Pokémon
3. Clique no Pokémon desejado
4. Os campos serão preenchidos automaticamente:
   - **Título**: Nome do Pokémon
   - **Descrição**: Descrição da Pokédex
   - **Categoria**: Tipo principal do Pokémon
5. Ajuste o preço e outras informações
6. Clique em "Cadastrar Pokémon"

### Preenchimento Manual

Você ainda pode preencher os dados manualmente se preferir, sem usar a busca da PokéAPI.

## Endpoints da PokéAPI Utilizados

```
Base URL: https://pokeapi.co/api/v2

GET /pokemon/{id or name}          - Dados completos do Pokémon
GET /pokemon?limit={n}&offset={n}  - Lista paginada
GET /pokemon-species/{id}          - Informações da espécie
```

## Exemplos de Dados Retornados

### Pokémon Básico
```typescript
{
  id: 25,
  name: "pikachu",
  sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
}
```

### Pokémon Detalhado
```typescript
{
  id: 25,
  name: "pikachu",
  height: 4,
  weight: 60,
  types: [{ type: { name: "electric" } }],
  abilities: [...],
  stats: [...],
  sprites: {
    front_default: "...",
    other: {
      "official-artwork": {
        front_default: "..."
      }
    }
  }
}
```

## Alterações no Sistema

### Renomeação: "Serviços" → "Troca"

Todos os textos foram atualizados para refletir o contexto de troca de Pokémon:

#### Arquivos Modificados:
- ✅ `/app/admin/layout.tsx` - Menu de navegação
- ✅ `/app/admin/listings/page.tsx` - Página de listagens admin
- ✅ `/app/dashboard/wallet/page.tsx` - Página de cadastro
- ✅ `/app/dashboard/market/page.tsx` - Página do mercado
- ✅ `/app/dashboard/page.tsx` - Dashboard principal

#### Mudanças de Texto:
- "Serviços" → "Troca"
- "Produtos" → "Pokémon"
- "Cadastrar Produto" → "Cadastrar Pokémon"
- "Comprar" → "Trocar"

## Próximos Passos Sugeridos

1. **Adicionar Filtros**
   - Filtrar por tipo de Pokémon
   - Filtrar por geração
   - Filtrar por região

2. **Melhorar Visualização**
   - Mostrar sprites animados
   - Exibir stats do Pokémon nos cards
   - Adicionar badges de tipos com cores

3. **Cache de Dados**
   - Implementar cache local para reduzir chamadas à API
   - Salvar Pokémon favoritos

4. **Validação**
   - Verificar se Pokémon já foi cadastrado
   - Sugerir preços baseados em raridade

## Recursos Adicionais

- **Documentação PokéAPI**: https://pokeapi.co/docs/v2
- **GraphQL Endpoint**: https://graphql.pokeapi.co/v1beta2
- **Sprites Repository**: https://github.com/PokeAPI/sprites

## Limitações

- A PokéAPI tem rate limiting (não documentado oficialmente)
- Recomenda-se implementar cache para produção
- Algumas descrições podem não estar disponíveis em português

## Suporte

Para dúvidas sobre a PokéAPI:
- GitHub: https://github.com/PokeAPI/pokeapi
- Discord: https://discord.gg/pokeapi
