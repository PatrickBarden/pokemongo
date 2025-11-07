'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Eye, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MarketPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    const { data } = await supabaseClient
      .from('listings')
      .select(`
        *,
        owner:owner_id(id, display_name)
      `)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (data) {
      setListings(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poke-blue mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-poke-dark">Mercado</h1>
          <p className="text-muted-foreground mt-1">
            Explore todos os produtos e serviços disponíveis
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-poke-blue text-poke-blue">
            {listings.length} produtos
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <Card
            key={listing.id}
            className="overflow-hidden hover:shadow-lg transition-shadow border-2 hover:border-poke-blue"
          >
            <CardHeader className="bg-gradient-to-r from-poke-blue/10 to-poke-yellow/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {listing.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {listing.owner?.display_name}
                  </p>
                </div>
                <Badge className="bg-poke-yellow text-poke-dark border-0">
                  {listing.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {listing.description}
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Preço sugerido</span>
                  <span className="text-xl font-bold text-poke-blue">
                    {formatCurrency(listing.price_suggested)}
                  </span>
                </div>

                {listing.accepts_offers && (
                  <Badge variant="outline" className="w-full justify-center border-poke-yellow text-poke-yellow">
                    <Star className="h-3 w-3 mr-1" />
                    Aceita ofertas
                  </Badge>
                )}

                {listing.regions && listing.regions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {listing.regions.slice(0, 3).map((region: string) => (
                      <Badge
                        key={region}
                        variant="secondary"
                        className="text-xs"
                      >
                        {region}
                      </Badge>
                    ))}
                    {listing.regions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{listing.regions.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-poke-blue hover:bg-poke-blue/90"
                    size="sm"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Comprar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-poke-blue text-poke-blue hover:bg-poke-blue/10"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {listings.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhum produto disponível no momento
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Novos produtos aparecerão aqui quando forem cadastrados
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
