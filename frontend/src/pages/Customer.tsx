import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ArrowRight, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { StripeCheckout } from '../components/StripeCheckout';

export default function Customer() {
  const { eventData, theme, loading } = useStore();
  const [tickets, setTickets] = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'details' | 'payment'>('details');
  const [purchased, setPurchased] = useState(false);

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');

  const selectedTicket = eventData?.ticketTypes.find(t => t.id === selectedTicketId) || eventData?.ticketTypes[0];
  const isSoldOut = selectedTicket?.stock === 0;
  const lineup = (eventData?.lineup || '').split(',').map((s: string) => s.trim()).filter(Boolean);

  // Auto-select first ticket type when data loads OR when selection is invalid
  useEffect(() => {
    if (eventData.ticketTypes.length > 0) {
      const exists = eventData.ticketTypes.find(t => t.id === selectedTicketId);
      if (!selectedTicketId || !exists) {
        setSelectedTicketId(eventData.ticketTypes[0].id);
      }
    }
  }, [eventData.ticketTypes, selectedTicketId]);

  const resetState = () => {
    setPurchased(false);
    setShowCheckout(false);
    setPaymentStep('details');
    setTickets(1);
    setBuyerName('');
    setBuyerEmail('');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <div className="flex items-center gap-3 text-white/30">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-mono">Cargando evento...</span>
      </div>
    </div>
  );

  if (!selectedTicket) return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <p className="text-white/30 text-sm font-mono">Cargando entradas...</p>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-[#0c0c0c] text-white overflow-x-hidden"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* ─── FULL-BLEED HERO ───────────────────────────────────────── */}
      <div className="relative min-h-screen flex flex-col">

        {/* Background image with tight, editorial vignette — no glow */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${theme.backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
            }}
          />
          {/* Clean gradient overlay — bottom-heavy, not color-tinted */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, rgba(12,12,12,0.35) 0%, rgba(12,12,12,0.55) 50%, rgba(12,12,12,0.96) 100%)'
          }} />
          {/* Single accent stripe on left edge */}
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: theme.primaryColor }} />
        </div>

        {/* ─── NAV ────────────────────────────────────────────────── */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
          <div className="text-xl font-bold tracking-tight">
            {eventData.logoText1}<span style={{ color: theme.primaryColor }}>{eventData.logoText2}</span>
          </div>
          <div className="flex items-center gap-6">
            <span
              className="hidden sm:flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest px-3 py-1.5 rounded-sm border"
              style={{ borderColor: `${theme.primaryColor}60`, color: theme.primaryColor }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: theme.primaryColor }} />
              Entradas disponibles
            </span>
            <Link
              to="/admin"
              className="text-xs font-mono uppercase tracking-widest text-white/30 hover:text-white/70 transition-colors"
            >
              Admin
            </Link>
          </div>
        </nav>

        {/* ─── HERO CONTENT ───────────────────────────────────────── */}
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-end lg:items-center px-6 md:px-10 pb-16 pt-10 lg:py-0 gap-12 lg:gap-6">

          {/* Left: Editorial event info */}
          <motion.div
            className="flex-1 lg:max-w-[55%]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Category label */}
            <p className="text-xs font-mono uppercase tracking-[0.3em] mb-5" style={{ color: theme.primaryColor }}>
              Próximo Evento · {eventData.date}
            </p>

            {/* Event name — huge, tight, white only */}
            <h1 className="text-[clamp(3rem,10vw,8rem)] font-bold leading-[0.88] tracking-tight uppercase mb-6 text-white">
              {eventData.partyName}
            </h1>

            {/* Tagline */}
            {eventData.tagline && (
              <p className="text-base md:text-lg text-white/50 font-light mb-8 max-w-sm">
                {eventData.tagline}
              </p>
            )}

            {/* Date + Location chips */}
            <div className="flex flex-wrap gap-3 mb-8">
              <span className="px-3 py-1.5 text-sm font-mono bg-white/8 border border-white/10 rounded-sm text-white/70">
                {eventData.date}
              </span>
              <span className="px-3 py-1.5 text-sm font-mono bg-white/8 border border-white/10 rounded-sm text-white/70 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {eventData.location}
              </span>
            </div>

            {/* Lineup tags */}
            {lineup.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-3 font-mono">Lineup</p>
                <div className="flex flex-wrap gap-2">
                  {lineup.map((artist: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs font-semibold px-3 py-1 rounded-sm border"
                      style={{ borderColor: `${theme.primaryColor}30`, color: theme.primaryColor, backgroundColor: `${theme.primaryColor}08` }}
                    >
                      {artist}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right: Ticket stub widget */}
          <motion.div
            className="w-full lg:w-auto lg:min-w-[380px] lg:max-w-[420px]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <TicketStub
              eventData={eventData}
              theme={theme}
              tickets={tickets}
              setTickets={setTickets}
              selectedTicketId={selectedTicketId}
              setSelectedTicketId={setSelectedTicketId}
              selectedTicket={selectedTicket}
              isSoldOut={isSoldOut}
              onContinue={() => setShowCheckout(true)}
            />
          </motion.div>
        </div>
      </div>

      {/* ─── CHECKOUT OVERLAY ───────────────────────────────────────── */}
      <AnimatePresence>
        {showCheckout && !purchased && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowCheckout(false); setPaymentStep('details'); }}
            />
            {/* Panel */}
            <motion.div
              className="fixed z-50 bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-6"
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            >
              {/*
               * PANEL — this is the white card that slides up.
               *
               * max-h-[85vh]          : cap height at 85% of the viewport.
               *                        Leaves a visible gap above on mobile so
               *                        the user knows the backdrop is tappable.
               * overflow-y-auto       : when content (Stripe PaymentElement + button)
               *                        is taller than the panel, show a scrollbar.
               *                        Without this, the "Pagar" button is hidden
               *                        below the fold with NO way to reach it.
               * WebkitOverflowScrolling: enables momentum (inertia) scrolling on
               *                        iOS Safari — without it the panel feels
               *                        frozen and unscrollable on iPhones.
               */}
              <div
                className="relative bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-7 max-h-[85vh] overflow-y-auto"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
              >
                {/* Close */}
                <button
                  onClick={() => { setShowCheckout(false); setPaymentStep('details'); }}
                  className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <AnimatePresence mode="wait">
                  {/* ── Step 1: Personal Details ── */}
                  {paymentStep === 'details' && (
                    <motion.div key="details" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <p className="text-xs font-mono text-white/30 uppercase tracking-wider mb-1">Tus datos</p>
                      <div className="flex items-center justify-between mb-6">
                        <p className="font-semibold">{selectedTicket.name} × {tickets}</p>
                        <p className="text-xl font-bold" style={{ color: theme.primaryColor }}>{(tickets * selectedTicket.price).toFixed(0)}€</p>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)}
                          placeholder="Nombre completo"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors"
                        />
                        <input
                          type="email"
                          value={buyerEmail}
                          onChange={e => setBuyerEmail(e.target.value)}
                          placeholder="Email — aquí recibirás tu QR"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors"
                        />
                        <button
                          disabled={!buyerName || !buyerEmail || !buyerEmail.includes('@')}
                          onClick={() => setPaymentStep('payment')}
                          className="w-full mt-2 py-4 rounded-lg font-semibold text-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          Continuar al pago <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-center text-xs text-white/20 mt-4">Pago seguro con tarjeta via Stripe</p>
                    </motion.div>
                  )}

                  {/* ── Step 2: Stripe Card Form ── */}
                  {paymentStep === 'payment' && (
                    <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                      <button
                        onClick={() => setPaymentStep('details')}
                        className="text-xs text-white/30 hover:text-white/60 transition-colors font-mono flex items-center gap-1 mb-5"
                      >
                        ← Volver
                      </button>
                      <StripeCheckout
                        theme={theme}
                        buyerName={buyerName}
                        buyerEmail={buyerEmail}
                        ticketId={selectedTicketId}
                        quantity={tickets}
                        selectedTicket={selectedTicket}
                        onClose={() => { setShowCheckout(false); setPaymentStep('details'); }}
                        onSuccess={(_piId) => { setPurchased(true); setShowCheckout(false); }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ✅ SUCCESS OVERLAY — shown after Stripe confirms payment and our backend issues tickets */}
      <AnimatePresence>
        {purchased && (
          <>
            {/* Dark, blurred backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Success card — spring animation for a satisfying pop-in */}
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            >
              <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">

                {/* Accent colour bar at top — uses the event's primary colour */}
                <div className="h-1 w-full" style={{ backgroundColor: theme.primaryColor }} />

                <div className="p-8 text-center">

                  {/*
                   * Animated checkmark ring.
                   * The outer motion.div pops in with a spring delay so the
                   * ring appears AFTER the card itself, creating a staged
                   * reveal that feels celebratory rather than abrupt.
                   */}
                  <motion.div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ backgroundColor: `${theme.primaryColor}18`, border: `2px solid ${theme.primaryColor}` }}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: 'spring', damping: 18, stiffness: 300 }}
                  >
                    <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" style={{ stroke: theme.primaryColor, strokeWidth: 2.5 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>

                  {/* Main headline text block — fades in slightly after the ring */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <p className="text-xs font-mono uppercase tracking-[0.25em] mb-2" style={{ color: theme.primaryColor }}>
                      Pago confirmado
                    </p>
                    <h2 className="text-2xl font-bold mb-1">
                      ¡Gracias por tu compra, {buyerName.split(' ')[0]}!
                    </h2>
                    <p className="text-white/50 text-sm mb-7">
                      ¡Te esperamos! 🎉 Tu entrada está en camino
                    </p>
                  </motion.div>

                  {/*
                   * Perforated ticket summary box.
                   * The dashed border mimics a physical ticket tear line,
                   * reinforcing the "you just bought a ticket" metaphor.
                   */}
                  <motion.div
                    className="border border-dashed border-white/15 rounded-xl p-4 mb-7 text-left"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                  >
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-2">Enviado a</p>
                    <p className="font-semibold text-sm truncate mb-3">{buyerEmail}</p>

                    {/* Itemised breakdown */}
                    <div className="border-t border-dashed border-white/10 pt-3 space-y-1.5">
                      <div className="flex justify-between text-xs font-mono text-white/40">
                        <span>Entrada</span>
                        <span>{selectedTicket.name}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono text-white/40">
                        <span>Cantidad</span>
                        <span>{tickets}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono font-semibold text-white/70 pt-1 border-t border-white/8">
                        <span>Total</span>
                        <span>{(tickets * selectedTicket.price).toFixed(0)}€</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Secondary action — fades in last so it doesn't compete with headline */}
                  <motion.button
                    onClick={resetState}
                    className="text-xs font-mono uppercase tracking-widest text-white/25 hover:text-white/70 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    + Comprar otra entrada
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Ticket Stub Component ──────────────────────────────────────────────── */

interface TicketStubProps {
  eventData: any;
  theme: any;
  tickets: number;
  setTickets: (fn: (t: number) => number) => void;
  selectedTicketId: string;
  setSelectedTicketId: (id: string) => void;
  selectedTicket: any;
  isSoldOut: boolean;
  onContinue: () => void;
}

function TicketStub({ eventData, theme, tickets, setTickets, selectedTicketId, setSelectedTicketId, selectedTicket, isSoldOut, onContinue }: TicketStubProps) {
  const total = (tickets * selectedTicket.price).toFixed(0);

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#161616', border: '1px solid rgba(255,255,255,0.08)' }}>

      {/* Ticket top — event info */}
      <div className="p-6 pb-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-1.5">Entrada</p>
            <p className="font-bold text-lg leading-tight">{eventData.partyName}</p>
          </div>
          {/* Accent dot */}
          <div className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ backgroundColor: `${theme.primaryColor}15`, border: `1.5px solid ${theme.primaryColor}40` }}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-mono text-white/40">
          <div>
            <p className="uppercase tracking-wider mb-1">Fecha</p>
            <p className="text-white/70 normal-case font-semibold">{eventData.date}</p>
          </div>
          <div>
            <p className="uppercase tracking-wider mb-1">Lugar</p>
            <p className="text-white/70 normal-case font-semibold leading-tight">{eventData.location.split(',')[0]}</p>
          </div>
        </div>
      </div>

      {/* Perforation line */}
      <div className="relative flex items-center px-0 my-0">
        <div className="w-5 h-5 rounded-full -ml-2.5" style={{ backgroundColor: '#0c0c0c', border: '1px solid rgba(255,255,255,0.08)', borderLeft: 'none' }} />
        <div className="flex-1 border-t-2 border-dashed border-white/8 mx-1" />
        <div className="w-5 h-5 rounded-full -mr-2.5" style={{ backgroundColor: '#0c0c0c', border: '1px solid rgba(255,255,255,0.08)', borderRight: 'none' }} />
      </div>

      {/* Ticket bottom — selection */}
      <div className="p-6 pt-5 space-y-4">

        {/* Ticket type selector */}
        <div className="space-y-2">
          {eventData.ticketTypes.map((t: any) => (
            <button
              key={t.id}
              disabled={t.stock === 0}
              onClick={() => { setSelectedTicketId(t.id); setTickets(() => 1); }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-left disabled:opacity-35 disabled:cursor-not-allowed"
              style={{
                backgroundColor: selectedTicketId === t.id ? `${theme.primaryColor}12` : 'rgba(255,255,255,0.03)',
                border: selectedTicketId === t.id ? `1.5px solid ${theme.primaryColor}50` : '1.5px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: selectedTicketId === t.id ? theme.primaryColor : 'rgba(255,255,255,0.2)' }}
                >
                  {selectedTicketId === t.id && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                  )}
                </div>
                <span className="font-semibold text-sm">{t.name}</span>
                {t.stock === 0 && (
                  <span className="text-[10px] uppercase font-mono tracking-wider text-red-400/70 border border-red-500/20 px-1.5 py-0.5 rounded">
                    Agotado
                  </span>
                )}
              </div>
              <span className="text-sm font-bold" style={{ color: selectedTicketId === t.id ? theme.primaryColor : 'rgba(255,255,255,0.5)' }}>
                {Number(t.price) % 1 === 0 ? `${t.price}€` : `${Number(t.price).toFixed(2)}€`}
              </span>
            </button>
          ))}
        </div>

        {/* Quantity */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-white/40 font-mono">Cantidad</span>
          <div className="flex items-center gap-4">
            <button
              disabled={isSoldOut || tickets <= 1}
              onClick={() => setTickets(t => Math.max(1, t - 1))}
              className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-lg font-light text-white/50 hover:text-white hover:border-white/30 transition-all disabled:opacity-25"
            >
              −
            </button>
            <span className="text-lg font-bold w-5 text-center">{tickets}</span>
            <button
              disabled={isSoldOut || tickets >= Math.min(10, selectedTicket.stock)}
              onClick={() => setTickets(t => Math.min(10, t + 1))}
              className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-lg font-light text-white/50 hover:text-white hover:border-white/30 transition-all disabled:opacity-25"
            >
              +
            </button>
          </div>
        </div>

        {/* CTA */}
        <button
          disabled={isSoldOut}
          onClick={onContinue}
          className="w-full py-3.5 rounded-lg font-semibold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: theme.primaryColor, color: '#000' }}
        >
          {isSoldOut ? 'Agotado' : (
            <>
              Comprar — {total}€
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-white/20 font-mono">Entrada enviada por email · QR de acceso</p>
      </div>
    </div>
  );
}
