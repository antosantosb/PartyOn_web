import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { StripeCheckout } from '../StripeCheckout';
import { API_BASE } from '../../config/api';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [infoModal, setInfoModal] = useState<'terms' | 'privacy' | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Discount states
  const [discountCode, setDiscountCode] = useState('');
  const [discountCodeError, setDiscountCodeError] = useState('');
  const [appliedCode, setAppliedCode] = useState<any>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [submittingFree, setSubmittingFree] = useState(false);

  const discountAmount = appliedCode ? appliedCode.discountAmount : 0;
  const finalPrice = Math.max(0, selectedTicket.price * quantity - discountAmount);
  const totalPrice = finalPrice.toFixed(2);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setValidatingDiscount(true);
    setDiscountCodeError('');
    try {
      const res = await fetch(`${API_BASE}/validate-discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCode,
          ticketTypeId: selectedTicket.id,
          quantity
        })
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCode(data);
      } else {
        const reasons: Record<string, string> = {
          'NOT_FOUND': t('errors.invalidCode'),
          'INACTIVE': t('errors.invalidCode'),
          'EXPIRED': t('errors.invalidCode'),
          'EXHAUSTED': t('errors.codeExhausted')
        };
        setDiscountCodeError(reasons[data.reason] || t('errors.invalidCode'));
      }
    } catch (err) {
      setDiscountCodeError(t('errors.connError'));
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleNextStep = async (e: FormEvent) => {
    e.preventDefault();
    setNameError('');
    setEmailError('');

    let hasError = false;

    if (!buyerName.trim()) {
      setNameError(t('errors.nameRequired'));
      hasError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!buyerEmail.trim()) {
      setEmailError(t('errors.emailRequired'));
      hasError = true;
    } else if (!emailRegex.test(buyerEmail)) {
      setEmailError(t('errors.emailInvalid'));
      hasError = true;
    }

    if (!hasError) {
      if (appliedCode && appliedCode.isFree) {
        setSubmittingFree(true);
        try {
          const res = await fetch(`${API_BASE}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              buyerName,
              buyerEmail,
              ticketId: selectedTicket.id,
              quantity,
              marketingConsent,
              discountCodeId: appliedCode.codeId,
              isFreeOrder: true
            })
          });
          const checkoutData = await res.json();
          if (checkoutData.success) {
            setStep('success');
          } else {
            setDiscountCodeError(checkoutData.error || t('errors.freeFailed'));
          }
        } catch (err) {
          setDiscountCodeError(t('errors.connError'));
        } finally {
          setSubmittingFree(false);
        }
      } else {
        setStep('payment');
      }
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
    setInfoModal(null);
    setMarketingConsent(false);
    setDiscountCode('');
    setDiscountCodeError('');
    setAppliedCode(null);
    setSubmittingFree(false);
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
                        {t('checkout.step1')}
                      </p>
                      <h3 className="font-display text-2xl uppercase tracking-wider text-white">
                        {t('checkout.title').toUpperCase()}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between bg-[#0a0a0a] border border-white/5 p-4 mb-6">
                      <div>
                        <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                          {t('checkout.selectedTicketLabel')}
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
                        label={t('checkout.nameLabel')}
                        type="text"
                        placeholder={t('checkout.namePlaceholder')}
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        error={nameError}
                        required
                      />

                      <Input
                        label={t('checkout.emailLabel')}
                        type="email"
                        placeholder={t('checkout.emailPlaceholder')}
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        error={emailError}
                        required
                      />

                      {/* Discount Code Section */}
                      <div className="space-y-2 pt-2 pb-2">
                        <label className="block text-[11px] font-mono text-white/40 uppercase tracking-widest">
                          {t('checkout.discountCode')}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={t('checkout.discountPlaceholder')}
                            value={discountCode}
                            onChange={(e) => {
                              setDiscountCode(e.target.value.toUpperCase());
                              setDiscountCodeError('');
                            }}
                            disabled={!!appliedCode || validatingDiscount}
                            className="bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-accent flex-1 font-bold tracking-widest uppercase disabled:opacity-50"
                          />
                          {appliedCode ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAppliedCode(null);
                                setDiscountCode('');
                              }}
                              className="px-4 py-2 border border-red-500 text-red-500 hover:bg-red-500/10 text-xs font-bold uppercase transition-all rounded-lg cursor-pointer"
                            >
                              {t('checkout.removeCode')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleApplyDiscount}
                              disabled={!discountCode.trim() || validatingDiscount}
                              className="px-4 py-2 bg-white/10 border border-white/20 text-white hover:bg-white/20 text-xs font-bold uppercase transition-all rounded-lg disabled:opacity-40 cursor-pointer"
                            >
                              {validatingDiscount ? '...' : t('checkout.applyCode')}
                            </button>
                          )}
                        </div>
                        {discountCodeError && (
                          <p className="text-xs text-red-500 font-mono mt-1">⚠ {discountCodeError}</p>
                        )}
                        {appliedCode && (
                          <p className="text-xs text-green-400 font-mono mt-1">
                            ✓ {t('checkout.discountApplied')} -{appliedCode.discountAmount.toFixed(2)}€ ({t('checkout.discountBy', { name: appliedCode.promoterName })})
                          </p>
                        )}
                      </div>

                      <p className="text-[11px] text-white/50 leading-relaxed text-center mt-4 mb-4 font-sans">
                        {t('checkout.termsWarningIntro')}{' '}
                        <button
                          type="button"
                          onClick={() => setInfoModal('terms')}
                          className="underline text-white/70 hover:text-white transition-colors cursor-pointer"
                        >
                          {t('checkout.termsAndConditions')}
                        </button>{' '}
                        {t('checkout.and')}{' '}
                        <button
                          type="button"
                          onClick={() => setInfoModal('privacy')}
                          className="underline text-white/70 hover:text-white transition-colors cursor-pointer"
                        >
                          {t('checkout.privacyPolicy')}
                        </button>{' '}
                        {t('checkout.termsWarningOutro')}
                      </p>

                      {/* Marketing consent checkbox */}
                      <label className="flex items-start gap-3 cursor-pointer group mt-4 mb-4 select-none">
                        <input
                          type="checkbox"
                          checked={marketingConsent}
                          onChange={(e) => setMarketingConsent(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className="w-6 h-6 flex-shrink-0 border-4 border-black rounded-none transition-colors duration-150 flex items-center justify-center bg-[#0a0a0a]"
                          style={{
                            backgroundColor: marketingConsent ? (theme.primaryColor || '#e63329') : '#0a0a0a',
                          }}
                        >
                          {marketingConsent && (
                            <svg className="w-4 h-4 text-black font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span
                          className="text-[11px] text-white/70 leading-normal tracking-wide font-sans"
                        >
                          {t('checkout.marketingConsent')}
                        </span>
                      </label>

                      <Button
                        type="submit"
                        variant="primary"
                        className="w-full flex items-center justify-center gap-2 mt-4"
                        disabled={submittingFree || validatingDiscount}
                      >
                        {submittingFree ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> {t('checkout.processingFree')}</>
                        ) : appliedCode && appliedCode.isFree ? (
                          <>{t('checkout.confirmFreeButton')} <ArrowRight className="w-4 h-4" /></>
                        ) : (
                          <>{t('checkout.buyButton')} <ArrowRight className="w-4 h-4" /></>
                        )}
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
                        className="text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-1.5 mb-3 transition-colors cursor-pointer"
                      >
                        ← {t('checkout.cancel')}
                      </button>
                      <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-accent mb-1">
                        {t('checkout.step2')}
                      </p>
                      <h3 className="font-display text-2xl uppercase tracking-wider text-white">
                        {t('checkout.title').toUpperCase()}
                      </h3>
                    </div>

                    <StripeCheckout
                      theme={theme}
                      buyerName={buyerName}
                      buyerEmail={buyerEmail}
                      ticketId={selectedTicket.id}
                      quantity={quantity}
                      selectedTicket={selectedTicket}
                      marketingConsent={marketingConsent}
                      discountCodeId={appliedCode?.codeId}
                      discountAmount={appliedCode?.discountAmount}
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
                      {t('success.transactionSuccess')}
                    </p>
                    <h3 className="font-display text-3xl uppercase tracking-wider text-white mb-2">
                      {t('success.title')}
                    </h3>
                    <p className="text-sm text-white/50 mb-6 px-4">
                      {t('success.message', { name: buyerName.split(' ')[0] })}
                    </p>

                    <div className="border border-dashed border-white/10 bg-[#0a0a0a] p-4 text-left font-mono text-xs text-white/70 space-y-2 mb-8 max-w-sm mx-auto">
                      <div className="flex justify-between">
                        <span className="text-white/35">{t('success.sentTo')}</span>
                        <span className="text-white truncate max-w-[200px]">{buyerEmail}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-2">
                        <span className="text-white/35">{t('success.ticket')}</span>
                        <span className="text-white uppercase">{selectedTicket.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/35">{t('success.quantity')}</span>
                        <span className="text-white">{quantity}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-2 font-bold text-accent">
                        <span>{t('success.total')}</span>
                        <span>{totalPrice}€</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="w-full"
                    >
                      {t('success.close')}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Sub-modal for Terms / Privacy */}
          <AnimatePresence>
            {infoModal && (
              <>
                <motion.div
                  key="sub-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setInfoModal(null)}
                  className="fixed inset-0 z-[60] bg-black/90 cursor-pointer pointer-events-auto"
                />
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                  <motion.div
                    key="sub-modal-content"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                    className="w-full max-w-sm bg-[#181818] border border-white/10 p-6 pointer-events-auto rounded-none select-none relative"
                  >
                    <button
                      onClick={() => setInfoModal(null)}
                      className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors p-1 cursor-pointer"
                      aria-label="Cerrar"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {infoModal === 'terms' ? (
                      <div>
                        <h4 className="font-display text-lg uppercase tracking-wider text-white mb-4">
                          {t('gdpr.termsTitle')}
                        </h4>
                        <div className="space-y-3 text-xs text-white/70 leading-relaxed font-mono">
                          <p>
                            <span className="text-accent font-bold">{t('gdpr.responsibleLabel')}:</span> {t('gdpr.responsibleValue')}
                          </p>
                          <p>
                            <span className="text-accent font-bold">{t('gdpr.purposeLabel')}:</span> {t('gdpr.purposeValue')}
                          </p>
                          <p>
                            <span className="text-accent font-bold">{t('gdpr.legitimationLabel')}:</span> {t('gdpr.legitimationValue')}
                          </p>
                          <p>
                            <span className="text-accent font-bold">{t('gdpr.recipientsLabel')}:</span> {t('gdpr.recipientsValue')}
                          </p>
                          <p>
                            <span className="text-accent font-bold">{t('gdpr.rightsLabel')}:</span> {t('gdpr.rightsValue')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-display text-lg uppercase tracking-wider text-white mb-4">
                          {t('gdpr.privacyTitle')}
                        </h4>
                        <div className="space-y-3 text-xs text-white/70 leading-relaxed font-mono">
                          <p className="text-accent font-bold uppercase tracking-wider">
                            {t('gdpr.privacySubtitle')}
                          </p>
                          <p>
                            {t('gdpr.privacyP1')}
                          </p>
                          <p>
                            {t('gdpr.privacyP2')}
                          </p>
                          <p>
                            {t('gdpr.privacyP3')}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => setInfoModal(null)}
                      className="w-full mt-6 text-xs"
                    >
                      {t('gdpr.understood')}
                    </Button>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
