import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { Nav } from '../components/layout/Nav';
import { Hero } from '../components/sections/Hero';
import { Ticker } from '../components/sections/Ticker';
import { Lineup } from '../components/sections/Lineup';
import { TicketSection } from '../components/sections/TicketSection';
// Branding sections temporarily disabled for Plan A
import { Footer } from '../components/layout/Footer';
import { CheckoutModal } from '../components/ticket/CheckoutModal';
import { getCleanImageUrl } from '../config/api';

export default function Customer() {
  const { eventData, theme, loading } = useStore();
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [ticketsCount, setTicketsCount] = useState(1);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Apply theme variables dynamically to the document root
  useEffect(() => {
    if (theme) {
      const primaryColor = theme.primaryColor || '#e63329';
      document.documentElement.style.setProperty('--color-accent', primaryColor);
      document.documentElement.style.setProperty('--accent', primaryColor);
    }
  }, [theme]);

  // Find the selected ticket (filtering out door type ticket types)
  const visibleTickets = eventData?.ticketTypes?.filter(t => !t.isDoorType) || [];
  const selectedTicket = visibleTickets.find(t => t.id === selectedTicketId) || visibleTickets[0];

  // Auto-select first ticket type if not set
  useEffect(() => {
    if (visibleTickets.length > 0 && (!selectedTicketId || !visibleTickets.some(t => t.id === selectedTicketId))) {
      setSelectedTicketId(visibleTickets[0].id);
    }
  }, [visibleTickets, selectedTicketId]);

  // Premium loading screen: Centered logo on solid black background (no spinner)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center select-none">
        <img
          src={(eventData?.logoText1 && (eventData.logoText1.startsWith('http') || eventData.logoText1.startsWith('/'))) ? getCleanImageUrl(eventData.logoText1) : "/logo.PNG"}
          alt="PartyOn Loading..."
          className="h-16 w-auto object-contain animate-pulse duration-1000"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col relative">
      {/* Navigation */}
      <Nav ctaLabel={eventData.ctaLabel || 'COMPRAR ENTRADA'} logoUrl={eventData.logoText1} />

      {/* Main Sections */}
      <main className="flex-1">
        {/* Fullscreen Hero */}
        <Hero eventData={eventData} theme={theme} />

        {/* Scrolling Banner */}
        <Ticker tickerText={eventData.tickerText} />

        {/* Event Lineup */}
        <Lineup lineup={eventData.lineup} />

        {/* Tickets Selector Section */}
        <TicketSection
          ticketTypes={eventData.ticketTypes || []}
          selectedTicketId={selectedTicketId}
          setSelectedTicketId={setSelectedTicketId}
          ticketsCount={ticketsCount}
          setTicketsCount={setTicketsCount}
          onCheckout={() => setIsCheckoutOpen(true)}
        />

        {/* Branding sections (Manifesto, Gallery, Newsletter) hidden for Plan A */}
      </main>

      {/* Footer */}
      <Footer logoUrl={eventData.logoText1} />

      {/* Checkout Modal (User Info -> Payment -> Success) */}
      {selectedTicket && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          selectedTicket={selectedTicket}
          quantity={ticketsCount}
          theme={theme}
        />
      )}
    </div>
  );
}
