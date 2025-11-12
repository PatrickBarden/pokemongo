// Utilitário para carregar SDK do Mercado Pago
export const loadMercadoPagoScript = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).MercadoPago) {
      resolve((window as any).MercadoPago);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => resolve((window as any).MercadoPago);
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

// Inicializar Mercado Pago com public key
export const initMercadoPago = async () => {
  const MP = await loadMercadoPagoScript();
  const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
  
  if (!publicKey) {
    throw new Error('Public key do Mercado Pago não configurada');
  }
  
  return new MP(publicKey);
};
