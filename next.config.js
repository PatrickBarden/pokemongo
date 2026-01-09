/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração para Capacitor - exportação estática
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,
  
  // Trailing slash para compatibilidade com Capacitor
  trailingSlash: process.env.CAPACITOR_BUILD === 'true',
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora erros de tipo durante build do Capacitor (tipos do Supabase desatualizados)
    ignoreBuildErrors: process.env.CAPACITOR_BUILD === 'true',
  },
  images: {
    // Desabilita otimização de imagens para build estático
    unoptimized: process.env.CAPACITOR_BUILD === 'true',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Headers de segurança adicionais
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      // Headers específicos para API
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
  // Redirecionamentos de segurança
  async redirects() {
    return [
      // Forçar HTTPS em produção
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://:host/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
