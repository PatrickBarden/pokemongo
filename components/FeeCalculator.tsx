'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Info,
  ArrowRight,
  Wallet
} from 'lucide-react';
import { calculateFee, getFeeTiers, type FeeCalculation, type FeeTier } from '@/server/actions/platform-fees';
import { formatCurrency } from '@/lib/format';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FeeCalculatorProps {
  initialValue?: number;
  showTiers?: boolean;
  compact?: boolean;
}

export function FeeCalculator({ initialValue = 100, showTiers = true, compact = false }: FeeCalculatorProps) {
  const [value, setValue] = useState(initialValue);
  const [calculation, setCalculation] = useState<FeeCalculation | null>(null);
  const [tiers, setTiers] = useState<FeeTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTiers();
  }, []);

  useEffect(() => {
    if (value > 0) {
      calculateFees();
    }
  }, [value]);

  const loadTiers = async () => {
    const data = await getFeeTiers();
    setTiers(data);
    setLoading(false);
  };

  const calculateFees = async () => {
    const result = await calculateFee(value);
    setCalculation(result);
  };

  const getTierForValue = (val: number) => {
    return tiers.find(t => 
      val >= t.min_value && (t.max_value === null || val <= t.max_value)
    );
  };

  const currentTier = getTierForValue(value);

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm text-blue-900">Simulador de Ganhos</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label className="text-xs text-gray-600">Preço de venda</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="pl-9 h-9"
                min={1}
              />
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 mt-5" />
          <div className="flex-1">
            <Label className="text-xs text-gray-600">Você recebe</Label>
            <div className="bg-green-100 text-green-800 font-bold text-lg px-3 py-1.5 rounded-md text-center">
              {calculation ? formatCurrency(calculation.sellerReceives) : '...'}
            </div>
          </div>
        </div>

        {calculation && (
          <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
            <span>Taxa total: {calculation.totalFeePercentage}%</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Plataforma ({calculation.platformPercentage}%): {formatCurrency(calculation.platformFee)}</p>
                  <p>Mercado Pago (5%): {formatCurrency(calculation.mercadopagoFee)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-poke-blue" />
          Calculadora de Taxas
        </CardTitle>
        <CardDescription>
          Simule quanto você receberá em cada venda
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input de valor */}
        <div>
          <Label htmlFor="sale-value">Valor da venda</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
            <Input
              id="sale-value"
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="pl-10 text-lg font-semibold"
              min={1}
              step={0.01}
            />
          </div>
        </div>

        {/* Resultado do cálculo */}
        {calculation && (
          <div className="space-y-4">
            <Separator />
            
            {/* Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Valor da venda</span>
                <span className="font-medium">{formatCurrency(calculation.transactionAmount)}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Taxa total</span>
                  <Badge variant="outline" className="text-xs">
                    {calculation.totalFeePercentage}%
                  </Badge>
                </div>
                <span className="text-red-600">- {formatCurrency(calculation.totalFee)}</span>
              </div>
              
              <div className="pl-4 space-y-1 text-xs text-gray-500 border-l-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <span>├ Plataforma ({calculation.platformPercentage}%)</span>
                  <span>{formatCurrency(calculation.platformFee)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>└ Mercado Pago (5%)</span>
                  <span>{formatCurrency(calculation.mercadopagoFee)}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">Você recebe</span>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculation.sellerReceives)}
                </span>
              </div>
            </div>

            {/* Faixa atual */}
            {currentTier && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-blue-800">
                  <Info className="h-4 w-4" />
                  <span className="font-medium">Sua faixa atual</span>
                </div>
                <p className="text-blue-600 mt-1">{currentTier.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Tabela de faixas */}
        {showTiers && tiers.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-green-600" />
                Taxas por Faixa de Valor
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                Quanto maior o valor, menor a taxa! Incentivamos vendas de maior valor.
              </p>
              <div className="space-y-2">
                {tiers.map((tier) => {
                  const isCurrentTier = currentTier?.id === tier.id;
                  return (
                    <div
                      key={tier.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isCurrentTier 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isCurrentTier ? 'bg-blue-500' : 'bg-gray-300'}`} />
                        <span className="text-sm">
                          {formatCurrency(tier.min_value)} 
                          {tier.max_value ? ` - ${formatCurrency(tier.max_value)}` : '+'}
                        </span>
                      </div>
                      <Badge 
                        variant={isCurrentTier ? 'default' : 'secondary'}
                        className={isCurrentTier ? 'bg-blue-600' : ''}
                      >
                        {tier.fee_percentage}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-xs text-yellow-800">
                    <p className="font-medium">Taxa mínima: R$ 10,00</p>
                    <p className="mt-1">
                      Se o cálculo da porcentagem resultar em menos de R$10, cobramos R$10 fixos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Componente de resumo de taxas para exibir em cards
export function FeeSummaryBadge({ amount }: { amount: number }) {
  const [calculation, setCalculation] = useState<FeeCalculation | null>(null);

  useEffect(() => {
    if (amount > 0) {
      calculateFee(amount).then(setCalculation);
    }
  }, [amount]);

  if (!calculation) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="cursor-help">
            Você recebe: {formatCurrency(calculation.sellerReceives)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="w-64">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Valor da venda:</span>
              <span>{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>Taxa total ({calculation.totalFeePercentage}%):</span>
              <span>-{formatCurrency(calculation.totalFee)}</span>
            </div>
            <div className="flex justify-between text-gray-400 pl-2">
              <span>├ Plataforma ({calculation.platformPercentage}%):</span>
              <span>{formatCurrency(calculation.platformFee)}</span>
            </div>
            <div className="flex justify-between text-gray-400 pl-2">
              <span>└ MP (5%):</span>
              <span>{formatCurrency(calculation.mercadopagoFee)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold text-green-400">
              <span>Você recebe:</span>
              <span>{formatCurrency(calculation.sellerReceives)}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
