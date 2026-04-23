/**
 * StripeCheckout.tsx
 * ------------------
 * Renders the Stripe PaymentElement (card form) inside our checkout modal.
 *
 * ── TWO-PHASE FLOW ──────────────────────────────────────────────────────────
 *
 *  Phase A  (backend)  POST /api/create-payment-intent
 *    → Our server creates a Stripe PaymentIntent and returns its clientSecret.
 *    → The clientSecret is a temporary, one-use token that authorises the
 *      front-end to collect card details for THIS specific payment amount.
 *
 *  Phase B  (Stripe SDK + backend)  stripe.confirmPayment(...)
 *    → The Stripe SDK sends card data directly to Stripe's servers (never ours).
 *    → Stripe returns a PaymentIntent with status 'succeeded' (or an error).
 *    → We then call our own POST /api/checkout with the paymentIntentId.
 *    → The backend re-verifies the status with Stripe before issuing tickets.
 *
 * ── WHY NOT SEND CARD DATA TO OUR SERVER? ───────────────────────────────────
 *  PCI DSS compliance. Direct card handling requires an expensive security audit.
 *  With Stripe's hosted fields (PaymentElement), card data goes straight from
 *  the browser to Stripe — our server only touches intent IDs and amounts.
 *
 * ── COMPONENT HIERARCHY ─────────────────────────────────────────────────────
 *  <StripeCheckout>          ← wraps <Elements> with the intent options
 *    <Elements>              ← Stripe context provider
 *      <CardForm>            ← calls useStripe/useElements (must be inside Elements)
 *        <PaymentElement />  ← Stripe-rendered iframe with card fields
 */

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Loader2, ArrowRight, X } from 'lucide-react';

/**
 * WHY IS stripePromise OUTSIDE THE COMPONENT?
 * `loadStripe` downloads the Stripe.js script and initialises the SDK.
 * If this were inside the component body, it would re-run on every render,
 * creating multiple SDK instances and causing the PaymentElement to flicker
 * and re-mount. Keeping it at module scope ensures it runs exactly once.
 */
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

import { API_BASE } from '../config/api';


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
      // Step 1: Ask Stripe to validate the form fields client-side before we
      // even hit our server. This surfaces card number/expiry errors instantly.
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setCardError(submitError.message ?? 'Error al validar la tarjeta');
        setIsProcessing(false);
        return;
      }

      // Step 2: Ask our backend to create a PaymentIntent.
      // The backend calculates the amount from the DB (never trust the client price).
      // It returns a clientSecret — a one-time token scoped to this payment.
      const piRes = await fetch(`${API_BASE}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, quantity })
      });
      const piData = await piRes.json();
      if (!piData.clientSecret) {
        setCardError(piData.error || 'No fue posible iniciar el pago');
        setIsProcessing(false);
        return;
      }

      // Step 3: Confirm the payment with Stripe.
      //
      // ── CRITICAL: billing_details must be passed here ──────────────────────
      // The PaymentElement above is configured with
      //   fields: { billingDetails: { name: 'never', email: 'never' } }
      // which tells Stripe: "don't render name/email fields — we already
      // collected them ourselves". But Stripe still REQUIRES those values to
      // create the PaymentMethod. If you suppress the fields but don't pass the
      // data here, Stripe throws:
      //   IntegrationError: You specified "never" for fields.billing_details.name
      //   but did not pass confirmParams.payment_method_data.billing_details.name
      // The fix is to include payment_method_data.billing_details below.
      // ──────────────────────────────────────────────────────────────────────
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: piData.clientSecret,
        confirmParams: {
          // Fallback redirect URL for 3D Secure (3DS) authentication flows.
          // Some banks require an out-of-app authentication page. After the
          // user approves it, Stripe redirects back to this URL with
          // ?payment_intent_client_secret=... and we'd need to handle it.
          // With redirect:'if_required' below, this only triggers when truly needed.
          return_url: window.location.href,

          // ── Required when fields are suppressed ────────────────────────────
          // We told PaymentElement not to render name/email fields (fields:'never'),
          // so we must supply those values here manually. Stripe attaches them
          // to the PaymentMethod object it creates, which is then used for
          // receipts, fraud signals, and payment method display in the dashboard.
          payment_method_data: {
            billing_details: {
              name: buyerName,
              email: buyerEmail,
            }
          }
        },
        // Avoid a full-page redirect when 3DS is not required (most test cards).
        // If the card DOES require 3DS, Stripe will still redirect automatically.
        redirect: 'if_required',
      });

      if (confirmError) {
        // confirmError covers: card declined, insufficient funds, expired card,
        // incorrect CVC, 3DS failed, etc.
        setCardError(confirmError.message ?? 'El pago fue rechazado');
        setIsProcessing(false);
        return;
      }

      // Step 4: Payment succeeded on Stripe's side.
      // Tell our backend to verify the PaymentIntent server-side and issue tickets.
      // We NEVER skip this verification — the backend calls stripe.paymentIntents.retrieve()
      // to confirm status==='succeeded' before touching the database.
      if (paymentIntent?.status === 'succeeded') {
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
      // Network-level failure (no internet, backend down, CORS, etc.)
      setCardError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/*
       * PaymentElement renders Stripe's hosted card form inside a sandboxed iframe.
       * Card data NEVER passes through our server — it goes directly to Stripe.
       *
       * layout:'tabs' shows payment method tabs (Card, iDEAL, SEPA…) if enabled
       * in your Stripe Dashboard. For a simple card-only integration you can
       * change this to layout:'auto'.
       *
       * fields.billingDetails:'never' suppresses the name/email fields because
       * we already collected them in Step 1 (the Details form). We then pass
       * those values via confirmParams.payment_method_data above.
       */}
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
          Test: 4242 4242 4242 4242 · fecha futura · cualquier CVC
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
  ticketId: string;
  quantity: number;
  selectedTicket: any;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
}

export function StripeCheckout({
  theme, buyerName, buyerEmail, ticketId, quantity, selectedTicket, onClose, onSuccess
}: StripeCheckoutProps) {
  const isPlaceholderKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY?.includes('REPLACE_ME');

  /**
   * elementsOptions — passed to the <Elements> provider.
   *
   * mode:'payment'  → tells Stripe this is a one-time payment (not a
   *                   subscription or setup intent). Required for PaymentElement.
   *
   * amount          → pre-sets the payment amount in the Elements context.
   *                   This is used for display purposes and to filter which
   *                   payment methods are available (some have minimum amounts).
   *                   The actual authoritative amount is always set server-side
   *                   in createPaymentIntent.
   *
   * currency:'eur'  → ISO 4217 currency code, lowercase.
   *
   * appearance      → customises the Stripe-hosted iframe to match our dark UI.
   *                   Variables map to CSS custom properties inside the iframe.
   */
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
        {/* Order summary — read-only, shown above the card form */}
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

        {/* Warning banner shown if the public key has not been configured yet */}
        {isPlaceholderKey && (
          <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-400/8 border border-amber-400/20 rounded-lg px-3 py-2.5 mb-2 font-mono">
            <span>⚠ ATENCIÓN: Configura tu VITE_STRIPE_PUBLIC_KEY en el archivo frontend/.env para probar el pago.</span>
          </div>
        )}

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
