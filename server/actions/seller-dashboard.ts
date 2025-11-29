'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export type SellerStats = {
  totalSales: number;
  totalRevenue: number;
  totalListings: number;
  activeListings: number;
  pendingOrders: number;
  completedOrders: number;
  averageRating: number;
  totalReviews: number;
  reputationScore: number;
  sellerLevel: string;
  verifiedSeller: boolean;
  conversionRate: number;
  totalViews: number;
  totalFavorites: number;
};

export type MonthlySales = {
  month: string;
  sales: number;
  revenue: number;
};

export type TopListing = {
  id: string;
  title: string;
  price_suggested: number;
  view_count: number;
  favorite_count: number;
  photo_url?: string;
  is_shiny: boolean;
  sales_count: number;
};

export type RecentSale = {
  id: string;
  order_number: string;
  pokemon_name: string;
  amount: number;
  buyer_name: string;
  status: string;
  created_at: string;
};

// Buscar estatísticas do vendedor
export async function getSellerStats(sellerId: string): Promise<SellerStats> {
  try {
    // Buscar dados do usuário
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('reputation_score, total_sales, average_rating, total_reviews_received, seller_level, verified_seller')
      .eq('id', sellerId)
      .single();

    // Buscar listings do vendedor
    const { data: listings } = await supabaseAdmin
      .from('listings')
      .select('id, active, view_count, favorite_count')
      .eq('owner_id', sellerId);

    // Buscar pedidos do vendedor
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, status, amount_total, total_amount')
      .eq('seller_id', sellerId);

    // Calcular estatísticas
    const totalListings = listings?.length || 0;
    const activeListings = listings?.filter(l => l.active).length || 0;
    const totalViews = listings?.reduce((sum, l) => sum + (l.view_count || 0), 0) || 0;
    const totalFavorites = listings?.reduce((sum, l) => sum + (l.favorite_count || 0), 0) || 0;

    const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
    const pendingOrders = orders?.filter(o => ['pending', 'payment_confirmed', 'awaiting_seller', 'seller_accepted', 'in_delivery'].includes(o.status)).length || 0;
    const totalRevenue = orders
      ?.filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.total_amount || o.amount_total || 0), 0) || 0;

    // Taxa de conversão: vendas / visualizações
    const conversionRate = totalViews > 0 ? (completedOrders / totalViews) * 100 : 0;

    return {
      totalSales: user?.total_sales || 0,
      totalRevenue,
      totalListings,
      activeListings,
      pendingOrders,
      completedOrders,
      averageRating: user?.average_rating || 0,
      totalReviews: user?.total_reviews_received || 0,
      reputationScore: user?.reputation_score || 100,
      sellerLevel: user?.seller_level || 'bronze',
      verifiedSeller: user?.verified_seller || false,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalViews,
      totalFavorites
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do vendedor:', error);
    return {
      totalSales: 0,
      totalRevenue: 0,
      totalListings: 0,
      activeListings: 0,
      pendingOrders: 0,
      completedOrders: 0,
      averageRating: 0,
      totalReviews: 0,
      reputationScore: 100,
      sellerLevel: 'bronze',
      verifiedSeller: false,
      conversionRate: 0,
      totalViews: 0,
      totalFavorites: 0
    };
  }
}

// Buscar vendas mensais (últimos 6 meses)
export async function getMonthlySales(sellerId: string): Promise<MonthlySales[]> {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('created_at, total_amount, amount_total, status')
      .eq('seller_id', sellerId)
      .eq('status', 'completed')
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: true });

    // Agrupar por mês
    const monthlyData: { [key: string]: { sales: number; revenue: number } } = {};
    
    // Inicializar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { sales: 0, revenue: 0 };
    }

    // Preencher com dados reais
    orders?.forEach(order => {
      const date = new Date(order.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        monthlyData[key].sales += 1;
        monthlyData[key].revenue += order.total_amount || order.amount_total || 0;
      }
    });

    // Converter para array
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return Object.entries(monthlyData).map(([key, data]) => {
      const [year, month] = key.split('-');
      return {
        month: `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`,
        sales: data.sales,
        revenue: data.revenue
      };
    });
  } catch (error) {
    console.error('Erro ao buscar vendas mensais:', error);
    return [];
  }
}

// Buscar anúncios mais populares
export async function getTopListings(sellerId: string, limit: number = 5): Promise<TopListing[]> {
  try {
    // Buscar listings com mais visualizações
    const { data: listings } = await supabaseAdmin
      .from('listings')
      .select('id, title, price_suggested, view_count, favorite_count, photo_url, is_shiny')
      .eq('owner_id', sellerId)
      .eq('active', true)
      .order('view_count', { ascending: false })
      .limit(limit);

    if (!listings) return [];

    // Buscar contagem de vendas para cada listing
    const listingsWithSales = await Promise.all(
      listings.map(async (listing) => {
        const { count } = await supabaseAdmin
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('listing_id', listing.id)
          .eq('status', 'completed');

        return {
          ...listing,
          sales_count: count || 0
        };
      })
    );

    return listingsWithSales as TopListing[];
  } catch (error) {
    console.error('Erro ao buscar top listings:', error);
    return [];
  }
}

// Buscar vendas recentes
export async function getRecentSales(sellerId: string, limit: number = 10): Promise<RecentSale[]> {
  try {
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        amount_total,
        status,
        created_at,
        buyer:buyer_id(display_name),
        listing:listing_id(title)
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!orders) return [];

    return orders.map((order: any) => ({
      id: order.id,
      order_number: order.order_number || order.id.slice(0, 8),
      pokemon_name: order.listing?.title || 'Pokémon',
      amount: order.total_amount || order.amount_total || 0,
      buyer_name: order.buyer?.display_name || 'Comprador',
      status: order.status,
      created_at: order.created_at
    }));
  } catch (error) {
    console.error('Erro ao buscar vendas recentes:', error);
    return [];
  }
}

// Buscar pedidos pendentes do vendedor
export async function getPendingSellerOrders(sellerId: string): Promise<any[]> {
  try {
    const { data } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        amount_total,
        status,
        created_at,
        buyer:buyer_id(display_name, email),
        listing:listing_id(title, photo_url)
      `)
      .eq('seller_id', sellerId)
      .in('status', ['awaiting_seller', 'seller_accepted', 'in_delivery', 'delivery_submitted'])
      .order('created_at', { ascending: false });

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar pedidos pendentes:', error);
    return [];
  }
}

// Buscar performance por categoria
export async function getCategoryPerformance(sellerId: string): Promise<{
  category: string;
  listings: number;
  sales: number;
  revenue: number;
}[]> {
  try {
    const { data: listings } = await supabaseAdmin
      .from('listings')
      .select('id, category')
      .eq('owner_id', sellerId);

    if (!listings) return [];

    // Agrupar por categoria
    const categoryMap: { [key: string]: { listings: number; listingIds: string[] } } = {};
    listings.forEach(listing => {
      if (!categoryMap[listing.category]) {
        categoryMap[listing.category] = { listings: 0, listingIds: [] };
      }
      categoryMap[listing.category].listings += 1;
      categoryMap[listing.category].listingIds.push(listing.id);
    });

    // Buscar vendas por categoria
    const results = await Promise.all(
      Object.entries(categoryMap).map(async ([category, data]) => {
        const { data: orders } = await supabaseAdmin
          .from('orders')
          .select('total_amount, amount_total')
          .in('listing_id', data.listingIds)
          .eq('status', 'completed');

        const sales = orders?.length || 0;
        const revenue = orders?.reduce((sum, o) => sum + (o.total_amount || o.amount_total || 0), 0) || 0;

        return {
          category,
          listings: data.listings,
          sales,
          revenue
        };
      })
    );

    return results.sort((a, b) => b.revenue - a.revenue);
  } catch (error) {
    console.error('Erro ao buscar performance por categoria:', error);
    return [];
  }
}
