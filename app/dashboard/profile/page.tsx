'use client';

import { useEffect, useState, useRef } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, MapPin, Phone, Save, Shield, Upload, Camera, X, Star, TrendingUp, Package, ShoppingCart, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UserReputationCard, ReviewList, ReviewDistribution, SellerBadge } from '@/components/reviews';
import { getUserReviews, getReviewDistribution } from '@/server/actions/reviews';
import type { Review, UserStats } from '@/server/actions/reviews';
import { PushNotificationToggle } from '@/components/push-notification-toggle';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userId, setUserId] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userData, setUserData] = useState({
    display_name: '',
    email: '',
    role: '',
    reputation_score: 0,
    created_at: '',
    pix_key: '',
    total_sales: 0,
    total_purchases: 0,
    total_reviews_received: 0,
    average_rating: 0,
    seller_level: 'bronze' as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond',
    verified_seller: false,
  });

  const [profileData, setProfileData] = useState({
    avatar_url: '',
    region: '',
    contact: '',
  });

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewDistribution, setReviewDistribution] = useState<{
    distribution: { rating: number; count: number; percentage: number }[];
    total: number;
  }>({ distribution: [], total: 0 });

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userId) {
      loadReviews();
    }
  }, [userId]);

  const loadReviews = async () => {
    const { reviews: userReviews } = await getUserReviews(userId, 10);
    setReviews(userReviews);

    const distribution = await getReviewDistribution(userId);
    setReviewDistribution(distribution);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione apenas arquivos de imagem');
        return;
      }
      
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 5MB');
        return;
      }

      setAvatarFile(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Buscar dados do usuário
      const { data: userInfo } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userInfo) {
        setUserData({
          display_name: (userInfo as any).display_name || '',
          email: (userInfo as any).email || '',
          role: (userInfo as any).role || '',
          reputation_score: (userInfo as any).reputation_score || 0,
          created_at: (userInfo as any).created_at || '',
          pix_key: (userInfo as any).pix_key || '',
          total_sales: (userInfo as any).total_sales || 0,
          total_purchases: (userInfo as any).total_purchases || 0,
          total_reviews_received: (userInfo as any).total_reviews_received || 0,
          average_rating: (userInfo as any).average_rating || 0,
          seller_level: (userInfo as any).seller_level || 'bronze',
          verified_seller: (userInfo as any).verified_seller || false,
        });
      }

      // Buscar perfil
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        const profileAvatarUrl = (profile as any).avatar_url || '';
        setProfileData({
          avatar_url: profileAvatarUrl,
          region: (profile as any).region || '',
          contact: (profile as any).contact || '',
        });
        
        // Prioridade: avatar do perfil > avatar do Google > null
        const avatarUrl = profileAvatarUrl || 
                          user.user_metadata?.avatar_url || 
                          user.user_metadata?.picture || 
                          '';
        if (avatarUrl) {
          setAvatarPreview(avatarUrl);
        }
      } else {
        // Se não tem perfil, tentar usar avatar do Google
        const googleAvatar = user.user_metadata?.avatar_url || 
                             user.user_metadata?.picture || 
                             '';
        if (googleAvatar) {
          setAvatarPreview(googleAvatar);
        }
      }

      setLoading(false);
    } catch (err: any) {
      setError('Erro ao carregar dados do perfil');
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let finalAvatarUrl = profileData.avatar_url;

      // Se houver um arquivo de imagem, converter para base64
      if (avatarFile) {
        const reader = new FileReader();
        finalAvatarUrl = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(avatarFile);
        });
      }

      // Atualizar nome de exibição e chave PIX na tabela users
      const { error: userError } = await (supabaseClient as any)
        .from('users')
        .update({
          display_name: userData.display_name,
          pix_key: userData.pix_key,
        })
        .eq('id', userId);

      if (userError) throw userError;

      // Verificar se perfil existe
      const { data: existingProfile } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingProfile) {
        // Atualizar perfil existente
        const { error: profileError } = await (supabaseClient as any)
          .from('profiles')
          .update({
            avatar_url: finalAvatarUrl,
            region: profileData.region,
            contact: profileData.contact,
          })
          .eq('user_id', userId);

        if (profileError) throw profileError;
      } else {
        // Criar novo perfil
        const { error: profileError } = await (supabaseClient as any)
          .from('profiles')
          .insert({
            user_id: userId,
            avatar_url: finalAvatarUrl,
            region: profileData.region,
            contact: profileData.contact,
          });

        if (profileError) throw profileError;
      }

      setSuccess('Perfil atualizado com sucesso!');
      setAvatarFile(null);
      
      // Recarregar dados
      setTimeout(() => {
        loadUserData();
      }, 1000);
    } catch (err: any) {
      setError('Erro ao salvar perfil: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 border-3 border-slate-200 rounded-full"></div>
          <div className="w-10 h-10 border-3 border-poke-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    const roleConfig: any = {
      admin: { label: 'Admin', color: 'bg-red-500' },
      mod: { label: 'Moderador', color: 'bg-orange-500' },
      user: { label: 'Usuário', color: 'bg-blue-500' },
    };
    const config = roleConfig[role] || roleConfig.user;
    return (
      <Badge className={`${config.color} text-white border-0`}>
        <Shield className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Gerencie suas informações pessoais
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-poke-blue bg-poke-blue/10">
          <AlertDescription className="text-poke-blue">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
        <Card className="md:col-span-1 border-2 border-poke-blue/20">
          <CardContent className="pt-4">
            <div className="flex flex-col items-center text-center space-y-3">
              {/* Avatar com Upload */}
              <div className="relative group">
                {avatarPreview ? (
                  <div className="relative">
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="h-24 w-24 rounded-full object-cover border-4 border-poke-blue shadow-lg"
                    />
                    {avatarFile && (
                      <button
                        type="button"
                        onClick={removeAvatar}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-poke-blue to-poke-yellow flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                    {userData.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Botão de Upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-poke-blue text-white rounded-full p-2.5 hover:bg-poke-blue/90 transition-all shadow-lg hover:scale-110"
                >
                  <Camera className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground">{userData.display_name}</h2>
                <p className="text-sm text-muted-foreground">{userData.email}</p>
              </div>
              
              <div className="flex flex-col gap-2 w-full">
                {getRoleBadge(userData.role)}
                <div className="flex items-center justify-center gap-2 text-sm bg-poke-yellow/10 rounded-lg py-2">
                  <span className="text-muted-foreground">Reputação:</span>
                  <span className="font-bold text-poke-yellow text-lg">{userData.reputation_score}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-2 border-poke-blue/20">
          <CardHeader>
            <CardTitle>Informações do Perfil</CardTitle>
            <CardDescription>
              Atualize suas informações pessoais e de contato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">
                  <User className="h-4 w-4 inline mr-2" />
                  Nome de Exibição
                </Label>
                <Input
                  id="display_name"
                  value={userData.display_name}
                  onChange={(e) => setUserData({ ...userData, display_name: e.target.value })}
                  placeholder="Seu nome"
                  className="border-poke-blue/30"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={userData.email}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Região
                </Label>
                <Input
                  id="region"
                  value={profileData.region}
                  onChange={(e) => setProfileData({ ...profileData, region: e.target.value })}
                  placeholder="Ex: São Paulo, Brasil"
                  className="border-poke-blue/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Contato
                </Label>
                <Textarea
                  id="contact"
                  value={profileData.contact}
                  onChange={(e) => setProfileData({ ...profileData, contact: e.target.value })}
                  placeholder="Telefone, WhatsApp, Discord, etc."
                  rows={3}
                  className="border-poke-blue/30"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Dica: Adicione seus contatos para facilitar as negociações
                </p>
              </div>

              <div className="space-y-2 p-3 bg-green-500/10 dark:bg-green-500/20 rounded-lg border border-green-500/30">
                <Label htmlFor="pix_key" className="text-green-700 dark:text-green-400">
                  💰 Chave PIX (para receber pagamentos)
                </Label>
                <Input
                  id="pix_key"
                  value={userData.pix_key}
                  onChange={(e) => setUserData({ ...userData, pix_key: e.target.value })}
                  placeholder="CPF, Email, Telefone ou Chave Aleatória"
                  className="border-green-500/30"
                />
                <p className="text-xs text-green-600 dark:text-green-400">
                  Quando você vender um Pokémon, o admin fará o pagamento para esta chave
                </p>
              </div>

              {avatarFile && (
                <Alert className="border-poke-blue bg-poke-blue/5">
                  <Upload className="h-4 w-4 text-poke-blue" />
                  <AlertDescription className="text-poke-blue">
                    Nova imagem selecionada: <strong>{avatarFile.name}</strong>
                    <br />
                    <span className="text-xs">Clique em &quot;Salvar Alterações&quot; para confirmar</span>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-poke-blue hover:bg-poke-blue/90"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Reputação e Avaliações */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Card de Reputação */}
        <Card className="border-2 border-poke-yellow/30 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-900/20 dark:to-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-poke-yellow" />
              Minha Reputação
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Badge de Nível */}
              <div className="flex items-center justify-between">
                <SellerBadge
                  level={userData.seller_level}
                  verified={userData.verified_seller}
                  rating={userData.average_rating}
                  size="lg"
                />
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border">
                <div className="text-center p-2 bg-muted/50 dark:bg-muted/30 rounded-lg">
                  <Package className="h-4 w-4 mx-auto text-green-500 mb-0.5" />
                  <p className="text-lg font-bold text-foreground">{userData.total_sales}</p>
                  <p className="text-[10px] text-muted-foreground">Vendas</p>
                </div>
                <div className="text-center p-2 bg-muted/50 dark:bg-muted/30 rounded-lg">
                  <ShoppingCart className="h-4 w-4 mx-auto text-blue-500 mb-0.5" />
                  <p className="text-lg font-bold text-foreground">{userData.total_purchases}</p>
                  <p className="text-[10px] text-muted-foreground">Compras</p>
                </div>
                <div className="text-center p-2 bg-muted/50 dark:bg-muted/30 rounded-lg">
                  <Star className="h-4 w-4 mx-auto text-yellow-500 mb-0.5" />
                  <p className="text-lg font-bold text-foreground">{userData.average_rating.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Média</p>
                </div>
                <div className="text-center p-2 bg-muted/50 dark:bg-muted/30 rounded-lg">
                  <TrendingUp className="h-4 w-4 mx-auto text-purple-500 mb-0.5" />
                  <p className="text-lg font-bold text-foreground">{userData.reputation_score}</p>
                  <p className="text-[10px] text-muted-foreground">Pontos</p>
                </div>
              </div>

              {/* Progresso para próximo nível */}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-foreground">Progresso para próximo nível</span>
                  <span className="font-medium text-poke-blue">
                    {userData.seller_level === 'diamond' ? 'Nível Máximo!' : `${Math.min(100, Math.round((userData.total_sales / getNextLevelRequirement(userData.seller_level)) * 100))}%`}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-poke-blue to-poke-yellow rounded-full transition-all duration-500"
                    style={{
                      width: userData.seller_level === 'diamond' ? '100%' : `${Math.min(100, (userData.total_sales / getNextLevelRequirement(userData.seller_level)) * 100)}%`
                    }}
                  />
                </div>
                {userData.seller_level !== 'diamond' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {getNextLevelRequirement(userData.seller_level) - userData.total_sales} vendas para o próximo nível
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Distribuição */}
        <Card className="border-2 border-poke-blue/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Distribuição de Avaliações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviewDistribution.total > 0 ? (
              <ReviewDistribution
                distribution={reviewDistribution.distribution}
                total={reviewDistribution.total}
                averageRating={userData.average_rating}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p>Você ainda não recebeu avaliações</p>
                <p className="text-sm mt-1">Complete vendas para receber avaliações!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Avaliações Recebidas */}
      <Card className="border-2 border-poke-blue/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Avaliações Recebidas ({userData.total_reviews_received})
          </CardTitle>
          <CardDescription>
            O que os outros usuários dizem sobre você
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewList
            reviews={reviews}
            emptyMessage="Você ainda não recebeu avaliações. Complete transações para receber feedback!"
          />
        </CardContent>
      </Card>

      <Card className="border-2 border-poke-blue/20">
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Data de Cadastro</p>
              <p className="font-medium">
                {new Date(userData.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Conta</p>
              <p className="font-medium">{getRoleBadge(userData.role)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Notificações */}
      <Card className="border-2 border-poke-blue/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-poke-blue" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure como deseja receber alertas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushNotificationToggle userId={userId} variant="inline" />
        </CardContent>
      </Card>
    </div>
  );
}

// Função auxiliar para obter requisito do próximo nível
function getNextLevelRequirement(currentLevel: string): number {
  switch (currentLevel) {
    case 'bronze': return 5;   // 5 vendas para silver
    case 'silver': return 20;  // 20 vendas para gold
    case 'gold': return 50;    // 50 vendas para platinum
    case 'platinum': return 100; // 100 vendas para diamond
    default: return 100;
  }
}
