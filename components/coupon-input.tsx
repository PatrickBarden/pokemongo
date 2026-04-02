'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { validateCoupon } from '@/server/actions/coupons';
import { formatCurrency } from '@/lib/format';
import { TicketPercent, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CouponInputProps {
  userId: string;
  orderAmount: number;
  onApply: (couponId: string, code: string, discountAmount: number, finalPrice: number) => void;
  onRemove: () => void;
  appliedCode?: string;
  appliedDiscount?: number;
  disabled?: boolean;
}

export function CouponInput({
  userId,
  orderAmount,
  onApply,
  onRemove,
  appliedCode,
  appliedDiscount,
  disabled,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');

    const result = await validateCoupon(code.trim(), userId, orderAmount);

    if (!result.valid || !result.coupon) {
      setError(result.error || 'Cupom inválido.');
      setLoading(false);
      return;
    }

    onApply(result.coupon.id, result.coupon.code, result.discountAmount, result.finalPrice);
    setCode('');
    setLoading(false);
  };

  const handleRemove = () => {
    setCode('');
    setError('');
    onRemove();
  };

  if (appliedCode && appliedDiscount !== undefined) {
    return (
      <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-600">
              Cupom <span className="font-mono">{appliedCode}</span> aplicado!
            </p>
            <p className="text-xs text-emerald-600/80">
              Desconto de {formatCurrency(appliedDiscount)}
            </p>
          </div>
        </div>
        {!disabled && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <TicketPercent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tem um cupom? Digite aqui"
            className={cn('pl-9 font-mono uppercase', error && 'border-destructive')}
            value={code}
            onChange={e => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
            disabled={disabled || loading}
          />
        </div>
        <Button
          variant="outline"
          onClick={handleApply}
          disabled={!code.trim() || loading || disabled}
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <XCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
