'use client';

import { useEffect, useState, useRef } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, MapPin, Phone, Save, Shield, Upload, Camera, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  });

  const [profileData, setProfileData] = useState({
    avatar_url: '',
    region: '',
    contact: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

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
        });
      }

      // Buscar perfil
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        const avatarUrl = (profile as any).avatar_url || '';
        setProfileData({
          avatar_url: avatarUrl,
          region: (profile as any).region || '',
          contact: (profile as any).contact || '',
        });
        if (avatarUrl) {
          setAvatarPreview(avatarUrl);
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

      // Atualizar nome de exibição na tabela users
      const { error: userError } = await (supabaseClient as any)
        .from('users')
        .update({
          display_name: userData.display_name,
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poke-blue mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando perfil...</p>
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
        <h1 className="text-2xl sm:text-3xl font-bold text-poke-dark">Meu Perfil</h1>
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
        <Card className="md:col-span-1 border-2 border-poke-blue/20 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Avatar com Upload */}
              <div className="relative group">
                {avatarPreview ? (
                  <div className="relative">
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="h-32 w-32 rounded-full object-cover border-4 border-poke-blue shadow-lg"
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
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-poke-blue to-poke-yellow flex items-center justify-center text-white font-bold text-4xl shadow-lg">
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
                <h2 className="text-xl font-bold text-poke-dark">{userData.display_name}</h2>
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
                  💡 Dica: Adicione seus contatos para facilitar as trocas
                </p>
              </div>

              {avatarFile && (
                <Alert className="border-poke-blue bg-poke-blue/5">
                  <Upload className="h-4 w-4 text-poke-blue" />
                  <AlertDescription className="text-poke-blue">
                    Nova imagem selecionada: <strong>{avatarFile.name}</strong>
                    <br />
                    <span className="text-xs">Clique em "Salvar Alterações" para confirmar</span>
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
    </div>
  );
}
