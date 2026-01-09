'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  MessageCircle, 
  ShieldCheck, 
  CreditCard, 
  Package, 
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Mail,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wallet,
  RefreshCw,
  Users,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// FAQs organizados por categoria
const faqCategories = [
  {
    id: 'compras',
    title: 'Compras',
    icon: Package,
    color: 'bg-blue-100 text-blue-600',
    faqs: [
      {
        question: 'Como faço para comprar um Pokémon?',
        answer: 'Para comprar um Pokémon, navegue pelo Mercado, encontre o Pokémon desejado e clique em "Comprar". Você será direcionado para o checkout onde poderá finalizar o pagamento via Mercado Pago (PIX, cartão de crédito/débito ou boleto).'
      },
      {
        question: 'Quais formas de pagamento são aceitas?',
        answer: 'Aceitamos PIX, cartões de crédito e débito de todas as bandeiras, e boleto bancário. Todos os pagamentos são processados de forma segura pelo Mercado Pago.'
      },
      {
        question: 'Como funciona a entrega do Pokémon?',
        answer: 'Após a confirmação do pagamento, nossa equipe entrará em contato para intermediar a troca no Pokémon GO. Você receberá instruções detalhadas sobre como adicionar o vendedor como amigo e realizar a troca com segurança.'
      },
      {
        question: 'Posso cancelar uma compra?',
        answer: 'Você pode solicitar o cancelamento antes da troca ser iniciada. Após o início da troca, o cancelamento só é possível em casos específicos. Entre em contato com nosso suporte para mais informações.'
      }
    ]
  },
  {
    id: 'vendas',
    title: 'Vendas',
    icon: Wallet,
    color: 'bg-green-100 text-green-600',
    faqs: [
      {
        question: 'Como faço para vender meus Pokémon?',
        answer: 'Acesse "Minhas Vendas" no menu, clique em "Adicionar Pokémon" e preencha as informações do Pokémon que deseja vender, incluindo preço, descrição e fotos. Após a aprovação, seu anúncio ficará disponível no Mercado.'
      },
      {
        question: 'Quanto tempo leva para meu anúncio ser aprovado?',
        answer: 'A aprovação geralmente ocorre em até 24 horas. Anúncios com informações completas e fotos de qualidade são aprovados mais rapidamente.'
      },
      {
        question: 'Quando recebo o pagamento da venda?',
        answer: 'O pagamento é liberado após a confirmação da entrega do Pokémon. O valor fica disponível na sua carteira e pode ser sacado a qualquer momento.'
      },
      {
        question: 'Quais são as taxas cobradas?',
        answer: 'Cobramos uma taxa de serviço que varia de 10% a 30% dependendo do valor da venda. Quanto maior o valor, menor a porcentagem. Acesse a página de Taxas para ver a tabela completa.'
      }
    ]
  },
  {
    id: 'seguranca',
    title: 'Segurança',
    icon: ShieldCheck,
    color: 'bg-purple-100 text-purple-600',
    faqs: [
      {
        question: 'Como a plataforma garante a segurança das transações?',
        answer: 'Todas as transações são intermediadas pela nossa equipe. O pagamento só é liberado ao vendedor após a confirmação da entrega. Além disso, utilizamos o Mercado Pago para processar pagamentos de forma segura.'
      },
      {
        question: 'O que acontece se eu não receber o Pokémon?',
        answer: 'Se a troca não for concluída, você receberá reembolso total. Nossa equipe monitora todas as transações e intervém em caso de problemas.'
      },
      {
        question: 'Como evitar golpes?',
        answer: 'Nunca realize transações fora da plataforma. Todas as comunicações e pagamentos devem ser feitos através do nosso sistema. Desconfie de ofertas muito abaixo do preço de mercado.'
      }
    ]
  },
  {
    id: 'conta',
    title: 'Conta e Perfil',
    icon: Users,
    color: 'bg-orange-100 text-orange-600',
    faqs: [
      {
        question: 'Como altero meus dados de perfil?',
        answer: 'Acesse seu perfil clicando no seu avatar no menu. Lá você pode alterar foto, nome de exibição, código de treinador e outras informações.'
      },
      {
        question: 'Esqueci minha senha, o que faço?',
        answer: 'Na tela de login, clique em "Esqueci minha senha" e siga as instruções para redefinir sua senha através do email cadastrado.'
      },
      {
        question: 'Como excluo minha conta?',
        answer: 'Para excluir sua conta, entre em contato com nosso suporte. Note que você precisa concluir todas as transações pendentes antes da exclusão.'
      }
    ]
  },
  {
    id: 'pagamentos',
    title: 'Pagamentos e Carteira',
    icon: CreditCard,
    color: 'bg-pink-100 text-pink-600',
    faqs: [
      {
        question: 'Como faço para sacar meu saldo?',
        answer: 'Acesse sua Carteira, clique em "Sacar" e informe os dados da sua conta bancária ou chave PIX. O saque é processado em até 2 dias úteis.'
      },
      {
        question: 'Qual o valor mínimo para saque?',
        answer: 'O valor mínimo para saque é de R$ 20,00.'
      },
      {
        question: 'Por que meu pagamento está pendente?',
        answer: 'Pagamentos via boleto podem levar até 3 dias úteis para serem confirmados. Pagamentos via PIX são confirmados instantaneamente. Se o problema persistir, entre em contato com o suporte.'
      }
    ]
  }
];

// Componente de FAQ Item
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left hover:text-poke-blue transition-colors"
      >
        <span className="font-medium text-slate-900 pr-4">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
        )}
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        isOpen ? "max-h-96 pb-4" : "max-h-0"
      )}>
        <p className="text-slate-600 text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState('compras');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar FAQs por busca
  const filteredCategories = faqCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq => 
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-poke-blue via-poke-blue to-blue-600 text-white pt-10">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link href="/dashboard" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/20 rounded-2xl">
              <HelpCircle className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Central de Ajuda</h1>
              <p className="text-white/80 mt-1">Encontre respostas para suas dúvidas</p>
            </div>
          </div>

          {/* Barra de busca */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por palavra-chave..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Cards de contato rápido */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 -mt-16">
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Chat com Suporte</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">Fale diretamente com nossa equipe</p>
            <Link href="/dashboard/messages">
              <Button className="w-full bg-green-600 hover:bg-green-700 rounded-xl">
                Iniciar Chat
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Email</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">suporte@pokemongo.com.br</p>
            <a href="mailto:suporte@pokemongo.com.br">
              <Button variant="outline" className="w-full rounded-xl">
                Enviar Email
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-100 rounded-xl">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Horário de Atendimento</h3>
            </div>
            <p className="text-sm text-slate-500">Segunda a Sexta: 9h às 18h</p>
            <p className="text-sm text-slate-500">Sábado: 9h às 13h</p>
          </div>
        </div>

        {/* Categorias de FAQ */}
        <div className="flex flex-wrap gap-2 mb-6">
          {faqCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setActiveCategory(category.id);
                setSearchQuery('');
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeCategory === category.id && !searchQuery
                  ? "bg-poke-blue text-white shadow-lg shadow-poke-blue/25"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              <category.icon className="h-4 w-4" />
              {category.title}
            </button>
          ))}
        </div>

        {/* Lista de FAQs */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {searchQuery ? (
            // Resultados da busca
            <>
              <div className="p-5 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">
                  Resultados para &quot;{searchQuery}&quot;
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredCategories.reduce((acc, cat) => acc + cat.faqs.length, 0)} resultado(s) encontrado(s)
                </p>
              </div>
              <div className="p-5">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <div key={category.id} className="mb-6 last:mb-0">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={cn("p-1.5 rounded-lg", category.color)}>
                          <category.icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-slate-700">{category.title}</span>
                      </div>
                      {category.faqs.map((faq, index) => (
                        <FAQItem key={index} question={faq.question} answer={faq.answer} />
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhum resultado encontrado</p>
                    <p className="text-sm text-slate-400 mt-1">Tente buscar por outras palavras</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Categoria selecionada
            <>
              {faqCategories.filter(c => c.id === activeCategory).map((category) => (
                <div key={category.id}>
                  <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", category.color)}>
                      <category.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">{category.title}</h2>
                      <p className="text-sm text-slate-500">{category.faqs.length} perguntas frequentes</p>
                    </div>
                  </div>
                  <div className="p-5">
                    {category.faqs.map((faq, index) => (
                      <FAQItem key={index} question={faq.question} answer={faq.answer} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Seção de dicas */}
        <div className="mt-8 bg-gradient-to-r from-poke-yellow/10 to-orange-100/50 rounded-2xl p-6 border border-poke-yellow/20">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-poke-yellow/20 rounded-xl flex-shrink-0">
              <Sparkles className="h-6 w-6 text-poke-yellow" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Dicas para uma boa experiência</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Mantenha seu código de treinador atualizado no perfil
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Responda às mensagens rapidamente para agilizar as trocas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Tire fotos claras dos seus Pokémon para vender mais rápido
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Verifique as avaliações dos vendedores antes de comprar
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Não encontrou o que procurava?</p>
          <Link href="/dashboard/messages" className="text-poke-blue font-medium hover:underline">
            Entre em contato com nosso suporte
          </Link>
        </div>
      </div>
    </div>
  );
}
