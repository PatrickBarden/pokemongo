'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Termos de Uso</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <p className="text-sm text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Aceitação dos Termos</h2>
          <p className="text-sm leading-relaxed">
            Ao acessar e utilizar a plataforma <strong>TGP Pokemon</strong> (&quot;Serviço&quot;), você concorda com estes 
            Termos de Uso. Se não concordar com algum termo, não utilize o Serviço.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Descrição do Serviço</h2>
          <p className="text-sm leading-relaxed">
            O TGP Pokemon é um marketplace que conecta jogadores de Pokémon GO para compra, 
            venda e troca de itens virtuais do jogo. Atuamos como intermediários facilitando 
            a comunicação e o pagamento entre as partes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. Cadastro e Conta</h2>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>O cadastro é realizado via autenticação Google OAuth</li>
            <li>Você é responsável por manter a segurança de sua conta</li>
            <li>Cada pessoa pode ter apenas uma conta na plataforma</li>
            <li>Informações falsas podem resultar no cancelamento da conta</li>
            <li>Você deve ter pelo menos 13 anos para utilizar o Serviço</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Regras de Uso</h2>
          <p className="text-sm leading-relaxed">Ao utilizar o Serviço, você concorda em:</p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Não publicar anúncios falsos ou enganosos</li>
            <li>Cumprir os acordos de compra/venda realizados na plataforma</li>
            <li>Não utilizar linguagem ofensiva no chat</li>
            <li>Não tentar burlar o sistema de pagamentos da plataforma</li>
            <li>Não compartilhar conteúdo ilegal ou impróprio</li>
            <li>Respeitar os demais usuários da comunidade</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. Transações e Pagamentos</h2>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Todas as transações devem ser realizadas através da plataforma</li>
            <li>Os pagamentos são processados por provedores terceiros (ex: Mercado Pago)</li>
            <li>A plataforma pode cobrar taxas de serviço sobre transações</li>
            <li>Disputas devem ser reportadas através do sistema da plataforma</li>
            <li>Reembolsos seguem a política específica de cada transação</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. Propriedade Intelectual</h2>
          <p className="text-sm leading-relaxed">
            Pokémon GO é marca registrada da Niantic/The Pokémon Company. 
            O TGP Pokemon não é afiliado, endossado ou patrocinado pela Niantic ou The Pokémon Company. 
            O conteúdo da plataforma (layout, código, design) é propriedade do TGP Pokemon.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">7. Limitação de Responsabilidade</h2>
          <p className="text-sm leading-relaxed">
            O TGP Pokemon atua como intermediário e não se responsabiliza por:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>A qualidade ou veracidade dos itens anunciados</li>
            <li>Disputas entre compradores e vendedores não resolvidas na plataforma</li>
            <li>Perdas decorrentes de uso indevido da conta pelo usuário</li>
            <li>Indisponibilidade temporária do Serviço por manutenção ou falhas técnicas</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. Suspensão e Cancelamento</h2>
          <p className="text-sm leading-relaxed">
            Reservamo-nos o direito de suspender ou cancelar contas que violem estes Termos, 
            pratiquem fraudes, ou prejudiquem outros usuários. Em caso de suspensão, 
            transações pendentes serão tratadas conforme a situação específica.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">9. Alterações nos Termos</h2>
          <p className="text-sm leading-relaxed">
            Podemos atualizar estes Termos a qualquer momento. 
            Mudanças significativas serão notificadas através do aplicativo. 
            O uso continuado do Serviço após alterações constitui aceitação dos novos Termos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">10. Legislação Aplicável</h2>
          <p className="text-sm leading-relaxed">
            Estes Termos são regidos pela legislação brasileira. 
            Qualquer disputa será resolvida no foro da comarca do domicílio do usuário, 
            conforme o Código de Defesa do Consumidor.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">11. Contato</h2>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li><strong>E-mail:</strong> suporte@tgppokemon.com</li>
            <li><strong>Plataforma:</strong> Chat de suporte no aplicativo</li>
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
