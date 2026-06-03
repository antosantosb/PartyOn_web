import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { StripeCheckout } from '../StripeCheckout';

interface TicketType {
  id: string;
  name: string;
  price: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTicket: TicketType;
  quantity: number;
  theme: any;
}

export function CheckoutModal({
  isOpen,
  onClose,
  selectedTicket,
  quantity,
  theme
}: CheckoutModalProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const totalPrice = (selectedTicket.price * quantity).toFixed(2);

  const handleNextStep = (e: FormEvent) => {
    e.preventDefault();
    setNameError('');
    setEmailError('');

    let hasError = false;

    if (!buyerName.trim()) {
      setNameError('El nombre es obligatorio.');
      hasError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!buyerEmail.trim()) {
      setEmailError('El correo es obligatorio.');
      hasError = true;
    } else if (!emailRegex.test(buyerEmail)) {
      setEmailError('Formato de correo electrónico inválido.');
      hasError = true;
    }

    if (!hasError) {
      setStep('payment');
    }
  };

  const handleSuccess = (_paymentIntentId: string) => {
    setStep('success');
  };

  const handleClose = () => {
    onClose();
    // Reset modal state
    setStep('details');
    setBuyerName('');
    setBuyerEmail('');
    setNameError('');
    setEmailError('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step !== 'success' ? handleClose : undefined}
            className="fixed inset-0 z-50 bg-black/85 cursor-pointer"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 pointer-events-none">
            <motion.div
              key="modal-content"
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full md:max-w-md bg-[#111111] border-t md:border border-white/10 p-6 md:p-8 max-h-[90vh] overflow-y-auto pointer-events-auto rounded-t-2xl md:rounded-none select-none relative"
            >
              {/* Close Button */}
              {step !== 'success' && (
                <button
                  onClick={handleClose}
                  className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors p-1"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <AnimatePresence mode="wait">
                {/* STEP 1: Name and Email form */}
                {step === 'details' && (
                  <motion.div
                    key="step-details"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-6">
                      <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-accent mb-1">
                        PASO 1 DE 2
                      </p>
                      <h3 className="font-display text-2xl uppercase tracking-wider text-white">
                        TUS DATOS
                      </h3>
                    </div>

                    <div className="flex items-center justify-between bg-[#0a0a0a] border border-white/5 p-4 mb-6">
                      <div>
                        <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                          Entrada Seleccionada
                        </p>
                        <p className="font-bold text-sm text-white uppercase mt-0.5">
                          {selectedTicket.name} x {quantity}
                        </p>
                      </div>
                      <span className="font-mono text-lg font-bold text-accent">
                        {totalPrice}€
                      </span>
                    </div>

                    <form onSubmit={handleNextStep} className="space-y-4">
                      <Input
                        label="Nombre Completo"
                        type="text"
                        placeholder="ej. Mateo Santos"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        error={nameError}
                        required
                      />

                      <Input
                        label="Correo Electrónico"
                        type="email"
                        placeholder="ej. mateo@gmail.com"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        error={emailError}
                        required
                      />

                      <Button
                        type="submit"
                        variant="primary"
                        className="w-full flex items-center justify-center gap-2 mt-6"
                      >
                        CONTINUAR AL PAGO <ArrowRight className="w-4 h-4" />
                      </Button>
                    </form>
                  </motion.div>
                )}

                {/* STEP 2: StripeCheckout */}
                {step === 'payment' && (
                  <motion.div
                    key="step-payment"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => setStep('details')}
                        className="text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-1.5 mb-3 transition-colors"
                      >
                        ← Volver a tus datos
                      </button>
                      <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-accent mb-1">
                        PASO 2 DE 2
                      </p>
                      <h3 className="font-display text-2xl uppercase tracking-wider text-white">
                        PAGO SEGURO
                      </h3>
                    </div>

                    <StripeCheckout
                      theme={theme}
                      buyerName={buyerName}
                      buyerEmail={buyerEmail}
                      ticketId={selectedTicket.id}
                      quantity={quantity}
                      selectedTicket={selectedTicket}
                      onClose={handleClose}
                      onSuccess={handleSuccess}
                    />
                  </motion.div>
                )}

                {/* STEP 3: Success Screen */}
                {step === 'success' && (
                  <motion.div
                    key="step-success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 200 }}
                    className="text-center py-6"
                  >
                    <div className="w-16 h-16 rounded-none flex items-center justify-center mx-auto mb-6 bg-accent/15 border border-accent">
                      <CheckCircle2 className="w-8 h-8 text-accent" />
                    </div>

                    <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-accent mb-2">
                      TRANSACCIÓN EXITOSA
                    </p>
                    <h3 className="font-display text-3xl uppercase tracking-wider text-white mb-2">
                      ¡GRACIAS POR COMPRAR!
                    </h3>
                    <p className="text-sm text-white/50 mb-6 px-4">
                      Hola {buyerName.split(' ')[0]}, tu entrada ha sido procesada correctamente y se ha enviado a tu correo.
                    </p>

                    <div className="border border-dashed border-white/10 bg-[#0a0a0a] p-4 text-left font-mono text-xs text-white/70 space-y-2 mb-8 max-w-sm mx-auto">
                      <div className="flex justify-between">
                        <span className="text-white/35">ENVIADO A</span>
                        <span className="text-white truncate max-w-[200px]">{buyerEmail}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-2">
                        <span className="text-white/35">ENTRADA</span>
                        <span className="text-white uppercase">{selectedTicket.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/35">CANTIDAD</span>
                        <span className="text-white">{quantity}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-2 font-bold text-accent">
                        <span>TOTAL</span>
                        <span>{totalPrice}€</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="w-full"
                    >
                      Cerrar y volver
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
