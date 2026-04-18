import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';

export default function Customer() {
  const { eventData, theme } = useStore();
  const [tickets, setTickets] = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState(eventData.ticketTypes[0]?.id || '');
  const [showCheckout, setShowCheckout] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  const selectedTicket = eventData.ticketTypes.find(t => t.id === selectedTicketId) || eventData.ticketTypes[0];
  const isSoldOut = selectedTicket?.stock === 0;
  const lineup = (eventData.lineup || eventData.artistInfo || '').split(',').map((s: string) => s.trim()).filter(Boolean);

  const handleCheckoutSubmit = async () => {
    if (!buyerName || !buyerEmail || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerName, buyerEmail, buyerPhone, ticketId: selectedTicketId, quantity: tickets })
      });
      const data = await res.json();
      if (data.success) {
        setPurchased(true);
      } else {
        alert(data.error);
      }
    } catch {
      alert('Error al procesar. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setPurchased(false);
    setShowCheckout(false);
    setTickets(1);
    setBuyerName('');
    setBuyerEmail('');
    setBuyerPhone('');
  };

  if (!selectedTicket) return <div className="min-h-screen bg-black flex items-center justify-center text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Cargando...</div>;

  // Parse date for the ticket stub display
  const dateParts = eventData.date.toUpperCase().split(' ');

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
              Próximo Evento · Música Latina
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
              dateParts={dateParts}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCheckout(false)}
            />
            {/* Panel */}
            <motion.div
              className="fixed z-50 bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-6"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            >
              <div
                className="relative bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-7"
              >
                {/* Close */}
                <button
                  onClick={() => setShowCheckout(false)}
                  className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Order summary bar */}
                <div className="flex items-center justify-between mb-7 pb-5 border-b border-white/8">
                  <div>
                    <p className="text-xs font-mono text-white/40 uppercase tracking-wider mb-1">Tu pedido</p>
                    <p className="font-semibold">{selectedTicket.name} × {tickets}</p>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                    {(tickets * selectedTicket.price).toFixed(0)}€
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
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
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={e => setBuyerPhone(e.target.value)}
                    placeholder="Teléfono para MB Way (opcional)"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors"
                  />

                  <button
                    onClick={handleCheckoutSubmit}
                    disabled={!buyerName || !buyerEmail || isLoading}
                    className="w-full mt-2 py-4 rounded-lg font-semibold text-black text-sm uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Procesando...
                      </span>
                    ) : (
                      <>Confirmar y pagar <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>

                <p className="text-center text-xs text-white/20 mt-4">
                  Recibirás tu entrada QR por email al instante.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── SUCCESS OVERLAY ─────────────────────────────────────────── */}
      <AnimatePresence>
        {purchased && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            >
              {/* Success "ticket" UI */}
              <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
                {/* Accent top stripe */}
                <div className="h-1.5 w-full" style={{ backgroundColor: theme.primaryColor }} />
                <div className="p-8 text-center">
                  {/* Checkmark */}
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ backgroundColor: `${theme.primaryColor}15`, border: `2px solid ${theme.primaryColor}` }}
                  >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" style={{ stroke: theme.primaryColor, strokeWidth: 2.5 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <h2 className="text-2xl font-bold mb-1">¡Listo, {buyerName.split(' ')[0]}!</h2>
                  <p className="text-white/40 text-sm mb-7">Tu entrada está en camino</p>

                  {/* Perforated email box */}
                  <div className="border border-dashed border-white/15 rounded-lg p-4 mb-7">
                    <p className="text-xs font-mono text-white/30 uppercase tracking-wider mb-1.5">Enviado a</p>
                    <p className="font-semibold text-sm truncate">{buyerEmail}</p>
                    <div className="mt-3 pt-3 border-t border-white/8 flex justify-between text-xs text-white/30 font-mono">
                      <span>{selectedTicket.name} × {tickets}</span>
                      <span>{(tickets * selectedTicket.price).toFixed(0)}€</span>
                    </div>
                  </div>

                  <button
                    onClick={resetState}
                    className="text-xs font-mono uppercase tracking-widest text-white/25 hover:text-white/60 transition-colors"
                  >
                    + Comprar otra entrada
                  </button>
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
  dateParts: string[];
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
                {t.price}€
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
