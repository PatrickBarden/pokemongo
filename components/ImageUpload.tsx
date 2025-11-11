'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase-client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string | null;
  userId: string;
}

export function ImageUpload({ onImageUploaded, currentImage, userId }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validações
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Formato não suportado. Use JPG, PNG ou WebP');
      return;
    }

    setError('');
    setUploading(true);

    try {
      // Criar preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload para Supabase Storage
      const { data, error: uploadError } = await supabaseClient.storage
        .from('pokemon-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabaseClient.storage
        .from('pokemon-photos')
        .getPublicUrl(fileName);

      onImageUploaded(publicUrl);
    } catch (err: any) {
      console.error('Erro no upload:', err);
      setError(err.message || 'Erro ao fazer upload da imagem');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Camera className="h-4 w-4 text-poke-blue" />
        <label className="text-sm font-medium">
          Foto do Pokémon <span className="text-red-500">*</span>
        </label>
      </div>
      
      <p className="text-xs text-muted-foreground mb-3">
        📸 Envie uma foto real do seu Pokémon para comprovar que você o possui. Isso aumenta a confiança dos compradores!
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        {preview ? (
          <div className="relative group">
            <div className="relative w-full h-64 bg-gradient-to-br from-poke-blue/10 to-poke-yellow/10 rounded-lg border-2 border-poke-blue/20 overflow-hidden">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </div>
            {!uploading && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-64 border-2 border-dashed border-poke-blue/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-poke-blue hover:bg-poke-blue/5 transition-all group"
          >
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-poke-blue/10 rounded-full flex items-center justify-center group-hover:bg-poke-blue/20 transition-colors">
                <Upload className="h-8 w-8 text-poke-blue" />
              </div>
              <div>
                <p className="text-sm font-medium text-poke-dark">
                  Clique para enviar uma foto
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG ou WebP até 5MB
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-poke-blue text-poke-blue hover:bg-poke-blue/10"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Selecionar Arquivo
              </Button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {preview && !uploading && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg p-2">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
          Foto carregada com sucesso!
        </div>
      )}
    </div>
  );
}
