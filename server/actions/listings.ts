'use server';

import { z } from 'zod';
import { getSupabaseAdminSingleton } from '@/lib/supabase-admin';

const supabase = getSupabaseAdminSingleton();
const listingsTable = supabase.from('listings') as any;
const accountListingsTable = supabase.from('account_listings') as any;

const pokemonListingSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(2000),
  category: z.string().trim().min(2).max(60),
  priceSuggested: z.number().finite().positive(),
  acceptsOffers: z.boolean(),
  isShiny: z.boolean(),
  hasCostume: z.boolean(),
  hasBackground: z.boolean(),
  isPurified: z.boolean(),
  isDynamax: z.boolean(),
  isGigantamax: z.boolean(),
  photoUrl: z.string().trim().url().optional().nullable(),
  pokemonData: z.any().nullable(),
});

const accountListingSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(10).max(4000),
  priceSuggested: z.number().finite().positive(),
  photoUrl: z.string().trim().url().optional().nullable(),
  accountLevel: z.number().int().min(1).max(60),
  team: z.string().trim().max(30).optional().nullable(),
  trainerCode: z.string().trim().max(30).optional().nullable(),
  totalPokemon: z.number().int().min(0).optional().nullable(),
  shinyCount: z.number().int().min(0).optional().nullable(),
  legendaryCount: z.number().int().min(0).optional().nullable(),
  mythicalCount: z.number().int().min(0).optional().nullable(),
  stardust: z.number().int().min(0).optional().nullable(),
  pokecoins: z.number().int().min(0).optional().nullable(),
  medalsGold: z.number().int().min(0).optional().nullable(),
  medalsTotal: z.number().int().min(0).optional().nullable(),
  hasSpecialItems: z.boolean(),
  specialItemsDescription: z.string().trim().max(2000).optional().nullable(),
});

export async function createPokemonListing(input: z.infer<typeof pokemonListingSchema>) {
  const parsed = pokemonListingSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Dados inválidos para criar anúncio', details: parsed.error.flatten() };
  }

  const payload = parsed.data;

  const { data, error } = await listingsTable
    .insert({
      owner_id: payload.userId,
      title: payload.title,
      description: payload.description,
      category: 'pokemon',
      pokemon_type: payload.category,
      price_suggested: payload.priceSuggested,
      accepts_offers: payload.acceptsOffers,
      is_shiny: payload.isShiny,
      has_costume: payload.hasCostume,
      has_background: payload.hasBackground,
      is_purified: payload.isPurified,
      is_dynamax: payload.isDynamax,
      is_gigantamax: payload.isGigantamax,
      pokemon_data: payload.pokemonData,
      photo_url: payload.photoUrl || null,
      active: false,
      admin_approved: false
    })
    .select('id')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Falha ao criar anúncio' };
  }

  return { success: true, listingId: data.id };
}

export async function createAccountListing(input: z.infer<typeof accountListingSchema>) {
  const parsed = accountListingSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Dados inválidos para criar anúncio de conta', details: parsed.error.flatten() };
  }

  const payload = parsed.data;

  const { data: listing, error: listingError } = await listingsTable
    .insert({
      owner_id: payload.userId,
      title: payload.title,
      description: payload.description,
      category: 'account',
      pokemon_type: 'account',
      price_suggested: payload.priceSuggested,
      accepts_offers: true,
      active: false,
      admin_approved: false,
      photo_url: payload.photoUrl || null,
      tags: ['account_sale']
    })
    .select('id')
    .single();

  if (listingError || !listing) {
    return { success: false, error: listingError?.message || 'Falha ao criar anúncio base da conta' };
  }

  const { error: accountError } = await accountListingsTable.insert({
    listing_id: listing.id,
    account_level: payload.accountLevel,
    team: payload.team || null,
    trainer_code: payload.trainerCode || null,
    total_pokemon: payload.totalPokemon ?? null,
    shiny_count: payload.shinyCount ?? null,
    legendary_count: payload.legendaryCount ?? null,
    mythical_count: payload.mythicalCount ?? null,
    stardust: payload.stardust ?? null,
    pokecoins: payload.pokecoins ?? null,
    medals_gold: payload.medalsGold ?? null,
    medals_total: payload.medalsTotal ?? null,
    has_special_items: payload.hasSpecialItems,
    special_items_description: payload.specialItemsDescription || null,
    updated_at: new Date().toISOString()
  });

  if (accountError) {
    await (listingsTable as any).delete().eq('id', listing.id);
    return { success: false, error: accountError.message || 'Falha ao criar detalhes da conta' };
  }

  return { success: true, listingId: listing.id };
}
