import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Loader2, ArrowRight, X } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const API_BASE = 'http://localhost:3000/api';

// ─── Inner form — must be inside <Elements> ───────────────────────────────────
interface CardFormProps {
  theme: any;
  buyerName: string;
  buyerEmail: string;
  ticketId: string;
  quantity: number;
  selectedTicket: any;
  onSuccess: (paymentIntentId: string) => void;
}

function CardForm({ theme, buyerName, buyerEmail, ticketId, quantity, selectedTicket, onSuccess }: CardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!stripe || !elements || isProcessing) return;
    setIsProcessing(true);
    setCardError(null);

    try {
      // Ask Stripe to validate and collect the card
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setCardError(submitError.message ?? 'Error al validar la tarjeta');
        setIsProcessing(false);
        return;
      }

      // 1. Create a payment intent on our backend
      const piRes = await fetch(`${API_BASE}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, quantity })
      });
      const piData = await piRes.json();
      if (!piData.clientSecret) {
        setCardError(piData.error || 'No se pudo iniciar el pago');
        setIsProcessing(false);
        return;
      }

      // 2. Confirm the payment with Stripe
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: piData.clientSecret,
        confirmParams: { return_url: window.location.href }, // fallback for 3DS redirect
        redirect: 'if_required' // avoid redirect when not needed
      });

      if (confirmError) {
        setCardError(confirmError.message ?? 'El pago fue rechazado');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // 3. Tell our backend to issue the tickets
        const checkoutRes = await fetch(`${API_BASE}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buyerName,
            buyerEmail,
            ticketId,
            quantity,
            paymentIntentId: paymentIntent.id
          })
        });
        const checkoutData = await checkoutRes.json();
        if (checkoutData.success) {
          onSuccess(paymentIntent.id);
        } else {
          setCardError(checkoutData.error || 'Error al registrar la entrada');
        }
      }
    } catch {
      setCardError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stripe card fields */}
      <PaymentElement
        options={{
          layout: 'tabs',
          fields: { billingDetails: { name: 'never', email: 'never' } }
        }}
      />

      {cardError && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-3 py-2.5">
          <span className="mt-0.5 flex-shrink-0">⚠</span>
          <span>{cardError}</span>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!stripe || !elements || isProcessing}
        className="w-full py-4 rounded-lg font-semibold text-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
        style={{ backgroundColor: theme.primaryColor }}
      >
        {isProcessing ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Procesando pago...</>
        ) : (
          <>Pagar {(quantity * selectedTicket.price).toFixed(0)}€ <ArrowRight className="w-4 h-4" /></>
        )}
      </button>

      {/* Test card hint — remove before going live */}
      {import.meta.env.DEV && (
        <p className="text-center text-[11px] font-mono text-white/20">
          Prueba: 4242 4242 4242 4242 · cualquier fecha futura · cualquier CVC
        </p>
      )}
    </div>
  );
}

// ─── Exported overlay component ───────────────────────────────────────────────
interface StripeCheckoutProps {
  theme: any;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  ticketId: string;
  quantity: number;
  selectedTicket: any;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
}

export function StripeCheckout({
  theme, buyerName, buyerEmail, ticketId, quantity, selectedTicket, onClose, onSuccess
}: StripeCheckoutProps) {
  // Stripe Elements appearance — dark, minimal, matches our UI
  const elementsOptions = {
    mode: 'payment' as const,
    amount: Math.round(selectedTicket.price * quantity * 100),
    currency: 'eur',
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: theme.primaryColor,
        colorBackground: '#1a1a1a',
        colorText: '#ffffff',
        colorDanger: '#f87171',
        fontFamily: "'Space Grotesk', sans-serif",
        borderRadius: '8px',
        spacingUnit: '4px'
      },
      rules: {
        '.Input': {
          border: '1px solid rgba(255,255,255,0.1)',
          backgroundColor: '#111',
          color: '#fff'
        },
        '.Input:focus': { border: `1px solid ${theme.primaryColor}60` },
        '.Label': { color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' }
      }
    }
  };

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <div className="space-y-5">
        {/* Order summary */}
        <div className="flex items-center justify-between pb-4 border-b border-white/8">
          <div>
            <p className="text-xs font-mono text-white/40 uppercase tracking-wider mb-1">Resumen</p>
            <p className="font-semibold text-sm">{selectedTicket.name} × {quantity}</p>
            <p className="text-xs text-white/30">{buyerEmail}</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
            {(quantity * selectedTicket.price).toFixed(0)}€
          </p>
        </div>

        <CardForm
          theme={theme}
          buyerName={buyerName}
          buyerEmail={buyerEmail}
          ticketId={ticketId}
          quantity={quantity}
          selectedTicket={selectedTicket}
          onSuccess={onSuccess}
        />

        <button
          onClick={onClose}
          className="w-full text-xs text-white/20 hover:text-white/40 transition-colors font-mono flex items-center justify-center gap-1"
        >
          <X className="w-3 h-3" /> Cancelar
        </button>
      </div>
    </Elements>
  );
}
