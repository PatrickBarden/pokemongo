'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Política de Privacidade</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <p className="text-sm text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Introdução</h2>
          <p className="text-sm leading-relaxed">
            A <strong>TGP Pokemon</strong> (&quot;nós&quot;, &quot;nosso&quot;) opera a plataforma TGP Pokemon (o &quot;Serviço&quot;), 
            um marketplace para compra e venda de itens entre jogadores de Pokémon GO. 
            Esta política descreve como coletamos, usamos e protegemos seus dados pessoais.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Dados que Coletamos</h2>
          <p className="text-sm leading-relaxed">Coletamos os seguintes dados quando você utiliza nosso Serviço:</p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li><strong>Dados de conta:</strong> nome, e-mail, foto de perfil (fornecidos via Google OAuth)</li>
            <li><strong>Dados de uso:</strong> páginas visitadas, interações com a plataforma, horários de acesso</li>
            <li><strong>Dados de transação:</strong> histórico de pedidos, valores, status de pagamentos</li>
            <li><strong>Dados de comunicação:</strong> mensagens enviadas no chat da plataforma, imagens compartilhadas</li>
            <li><strong>Dados do dispositivo:</strong> tipo de dispositivo, sistema operacional, versão do aplicativo</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. Como Usamos seus Dados</h2>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Fornecer, manter e melhorar o Serviço</li>
            <li>Processar transações e pagamentos</li>
            <li>Facilitar a comunicação entre compradores e vendedores</li>
            <li>Enviar notificações sobre pedidos e atualizações da plataforma</li>
            <li>Prevenir fraudes e garantir a segurança da plataforma</li>
            <li>Cumprir obrigações legais</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Compartilhamento de Dados</h2>
          <p className="text-sm leading-relaxed">
            Não vendemos seus dados pessoais. Podemos compartilhar dados com:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li><strong>Processadores de pagamento:</strong> para processar transações financeiras (ex: Mercado Pago)</li>
            <li><strong>Provedores de infraestrutura:</strong> para hospedar e operar o Serviço (ex: Supabase, Vercel)</li>
            <li><strong>Outros usuários:</strong> seu nome e foto de perfil são visíveis para outros usuários da plataforma</li>
            <li><strong>Autoridades legais:</strong> quando exigido por lei ou ordem judicial</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. Armazenamento e Segurança</h2>
          <p className="text-sm leading-relaxed">
            Seus dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS/TLS) 
            e em repouso. Utilizamos práticas de segurança como autenticação OAuth 2.0, 
            Row Level Security (RLS) no banco de dados, e controle de acesso por roles.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. Seus Direitos (LGPD)</h2>
          <p className="text-sm leading-relaxed">
            De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incompletos ou desatualizados</li>
            <li>Solicitar a exclusão de seus dados</li>
            <li>Revogar consentimento a qualquer momento</li>
            <li>Solicitar a portabilidade de seus dados</li>
            <li>Obter informações sobre o compartilhamento de dados</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">7. Cookies e Tecnologias Similares</h2>
          <p className="text-sm leading-relaxed">
            Utilizamos cookies e armazenamento local para manter sua sessão de login, 
            preferências de tema (claro/escuro) e melhorar sua experiência. 
            Não utilizamos cookies de rastreamento de terceiros para fins publicitários.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. Retenção de Dados</h2>
          <p className="text-sm leading-relaxed">
            Mantemos seus dados enquanto sua conta estiver ativa. 
            Após solicitação de exclusão, seus dados serão removidos em até 30 dias, 
            exceto quando necessário para cumprir obrigações legais ou resolver disputas.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">9. Menores de Idade</h2>
          <p className="text-sm leading-relaxed">
            Nosso Serviço não é direcionado a menores de 13 anos. 
            Não coletamos intencionalmente dados de crianças menores de 13 anos. 
            Caso identifiquemos uma conta de menor, ela será encerrada.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">10. Alterações nesta Política</h2>
          <p className="text-sm leading-relaxed">
            Podemos atualizar esta política periodicamente. 
            Notificaremos sobre mudanças significativas através do aplicativo ou por e-mail. 
            O uso continuado do Serviço após alterações constitui aceitação da nova política.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">11. Contato</h2>
          <p className="text-sm leading-relaxed">
            Para dúvidas sobre esta política ou para exercer seus direitos, entre em contato:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li><strong>E-mail:</strong> suporte@tgppokemon.com</li>
            <li><strong>Plataforma:</strong> Através do chat de suporte no aplicativo</li>
          </ul>
        </section>

        <div className="pt-6 border-t">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} TGP Pokemon. Todos os direitos reservados.
          </p>
        </div>
      </main>
    </div>
  );
}
