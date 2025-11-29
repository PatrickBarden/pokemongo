'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Info,
  ShieldCheck,
  CreditCard,
  Wallet,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { FeeCalculator } from '@/components/FeeCalculator';
import { getFeeTiers, type FeeTier } from '@/server/actions/platform-fees';
import { formatCurrency } from '@/lib/format';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function FeesPage() {
  const [tiers, setTiers] = useState<FeeTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    const data = await getFeeTiers();
    setTiers(data);
    setLoading(false);
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-poke-dark flex items-center justify-center gap-3">
          <Percent className="h-8 w-8 text-poke-blue" />
          Taxas e Comissões
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Entenda como funcionam as taxas do marketplace e quanto você recebe em cada venda.
          Nossas taxas são escalonadas: quanto maior o valor, menor a porcentagem!
        </p>
      </div>

      {/* Calculadora */}
      <FeeCalculator initialValue={100} showTiers={false} />

      {/* Tabela de Taxas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-green-600" />
            Tabela de Taxas Escalonadas
          </CardTitle>
          <CardDescription>
            Taxas regressivas que incentivam vendas de maior valor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Faixa de Valor</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Taxa Plataforma</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Taxa MP</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Total Descontado</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Você Recebe*</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier, index) => {
                  // fee_percentage já é a taxa TOTAL (inclui 5% do MP)
                  const totalFee = tier.fee_percentage;
                  const platformFee = tier.fee_percentage - 5; // O que a plataforma recebe
                  const sellerReceives = 100 - totalFee;
                  return (
                    <tr key={tier.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-3 px-4">
                        <span className="font-medium">
                          {formatCurrency(tier.min_value)}
                          {tier.max_value ? ` - ${formatCurrency(tier.max_value)}` : ' ou mais'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {platformFee}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          5%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="destructive" className="bg-red-100 text-red-700">
                          {totalFee}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-green-600">{sellerReceives}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            * Valor aproximado. O valor exato depende do cálculo sobre o preço de venda.
          </p>
        </CardContent>
      </Card>

      {/* Cards informativos */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-100 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-blue-900">Taxa Mínima</h3>
            </div>
            <p className="text-sm text-blue-700">
              Se o cálculo da porcentagem resultar em menos de <strong>R$ 10,00</strong>, 
              cobramos R$ 10 fixos para cobrir custos operacionais.
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-purple-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-purple-900">Taxa Mercado Pago</h3>
            </div>
            <p className="text-sm text-purple-700">
              O Mercado Pago cobra <strong>5%</strong> sobre cada transação. 
              Essa taxa é do processador de pagamentos, não da plataforma.
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-100 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-green-900">Recebimento</h3>
            </div>
            <p className="text-sm text-green-700">
              Após a venda ser concluída, o valor líquido fica disponível para 
              <strong> saque via PIX</strong> na sua carteira.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Exemplos práticos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-poke-blue" />
            Exemplos Práticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              // Taxa mínima R$10: R$30 - R$10 = R$20
              { value: 30, totalFee: 10, platformFee: 8.5, mpFee: 1.5, receives: 20, note: 'Taxa mínima R$10' },
              // R$100 x 20% = R$20 total (R$15 plataforma + R$5 MP)
              { value: 100, totalFee: 20, platformFee: 15, mpFee: 5, receives: 80, note: 'Faixa 20% (R$50-R$149)' },
              // R$300 x 15% = R$45 total (R$30 plataforma + R$15 MP)
              { value: 300, totalFee: 45, platformFee: 30, mpFee: 15, receives: 255, note: 'Faixa 15% (R$150-R$499)' },
              // R$1000 x 10% = R$100 total (R$50 plataforma + R$50 MP)
              { value: 1000, totalFee: 100, platformFee: 50, mpFee: 50, receives: 900, note: 'Faixa 10% (R$1.000+)' },
            ].map((example, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Venda de {formatCurrency(example.value)}</span>
                  <Badge variant="outline" className="text-xs">{example.note}</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Taxa total:</span>
                    <span className="text-red-600">-{formatCurrency(example.totalFee)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-xs pl-2">
                    <span>├ Plataforma:</span>
                    <span>{formatCurrency(example.platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-xs pl-2">
                    <span>└ Mercado Pago:</span>
                    <span>{formatCurrency(example.mpFee)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Você recebe:</span>
                    <span className="text-green-600">{formatCurrency(example.receives)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-poke-blue" />
            Perguntas Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Por que as taxas são escalonadas?</AccordionTrigger>
              <AccordionContent>
                Taxas escalonadas incentivam vendas de maior valor e tornam o marketplace 
                mais justo. Transações pequenas têm custos operacionais proporcionalmente 
                maiores, por isso a taxa é mais alta. Já vendas grandes têm economia de escala.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2">
              <AccordionTrigger>O que é a taxa mínima de R$10?</AccordionTrigger>
              <AccordionContent>
                Se você vender algo por R$20 e a taxa de 30% seria R$6, cobramos R$10 
                para cobrir os custos mínimos de operação. Isso garante que a plataforma 
                seja sustentável mesmo em transações pequenas.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger>A taxa do Mercado Pago é separada?</AccordionTrigger>
              <AccordionContent>
                Sim! O Mercado Pago cobra 5% sobre cada transação como processador de 
                pagamentos. Essa taxa é deles, não nossa. Nós apenas repassamos esse custo 
                de forma transparente.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4">
              <AccordionTrigger>Quando recebo meu dinheiro?</AccordionTrigger>
              <AccordionContent>
                Após a venda ser concluída (comprador confirmar recebimento), o valor 
                líquido fica disponível na sua carteira. Você pode solicitar saque via 
                PIX a qualquer momento.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5">
              <AccordionTrigger>Posso ver quanto vou receber antes de anunciar?</AccordionTrigger>
              <AccordionContent>
                Sim! Use a calculadora no topo desta página ou na página de criação de 
                anúncio. Basta inserir o preço desejado e você verá exatamente quanto 
                receberá após as taxas.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Benefícios */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <ShieldCheck className="h-5 w-5" />
            Por que vale a pena?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              'Pagamento seguro via Mercado Pago',
              'Proteção contra fraudes',
              'Suporte ao vendedor e comprador',
              'Sistema de avaliações e reputação',
              'Visibilidade para milhares de jogadores',
              'Saque rápido via PIX',
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
