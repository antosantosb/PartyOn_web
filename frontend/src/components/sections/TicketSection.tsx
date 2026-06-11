import { useEffect } from 'react';
import { Plus, Minus, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  maxStock: number;
  soldCount: number;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  forceSoldOut: boolean;
  isDoorType: boolean;
}

interface TicketSectionProps {
  ticketTypes: TicketType[];
  selectedTicketId: string;
  setSelectedTicketId: (id: string) => void;
  ticketsCount: number;
  setTicketsCount: (count: number) => void;
  onCheckout: () => void;
}

export function TicketSection({
  ticketTypes,
  selectedTicketId,
  setSelectedTicketId,
  ticketsCount,
  setTicketsCount,
  onCheckout
}: TicketSectionProps) {
  const { t } = useTranslation();
  const visibleTicketTypes = ticketTypes.filter((t) => !t.isDoorType);

  const getTicketStatus = (t: TicketType): { available: boolean; label: string; key?: string } => {
    if (t.forceSoldOut) return { available: false, label: 'Agotado', key: 'storefront.soldOut' };
    if (t.soldCount >= t.maxStock) return { available: false, label: 'Agotado', key: 'storefront.soldOut' };
    const now = new Date();
    if (t.saleStartsAt && new Date(t.saleStartsAt) > now) {
      return { available: false, label: 'Próximamente', key: 'storefront.comingSoon' };
    }
    if (t.saleEndsAt && new Date(t.saleEndsAt) < now) {
      return { available: false, label: 'Venta Finalizada', key: 'storefront.saleEnded' };
    }
    return { available: true, label: '' };
  };

  const selectedTicket = visibleTicketTypes.find((t) => t.id === selectedTicketId) || visibleTicketTypes[0];

  useEffect(() => {
    if (visibleTicketTypes.length > 0) {
      const exists = visibleTicketTypes.find((t) => t.id === selectedTicketId);
      if (!selectedTicketId || !exists) {
        const firstAvailable = visibleTicketTypes.find((t) => getTicketStatus(t).available);
        setSelectedTicketId(firstAvailable?.id || visibleTicketTypes[0].id);
      }
    }
  }, [visibleTicketTypes, selectedTicketId, setSelectedTicketId]);

  if (visibleTicketTypes.length === 0) {
    return (
      <section
        id="tickets-section"
        className="bg-bg-alt py-24 px-6 text-center border-b-2 border-border"
      >
        <p className="text-text-muted text-sm font-mono uppercase tracking-widest">
          {t('storefront.noTicketsAvailable')}
        </p>
      </section>
    );
  }

  const selectedStatus = selectedTicket ? getTicketStatus(selectedTicket) : { available: false, label: '', key: undefined };
  const isSoldOut = !selectedStatus.available;
  const totalPrice = selectedTicket ? (ticketsCount * selectedTicket.price).toFixed(2) : '0.00';
  const remainingStock = selectedTicket ? selectedTicket.maxStock - selectedTicket.soldCount : 0;
  const maxBuyLimit = Math.min(10, remainingStock);

  return (
    <section
      id="tickets-section"
      className="bg-bg-alt py-24 px-6 border-b-2 border-border relative"
    >
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-12">
          <span className="section-label mb-2 block">{t('storefront.ticketSectionLabel')}</span>
          <h2 className="font-display text-4xl md:text-5xl uppercase tracking-tighter text-white">
            {t('storefront.buyTicketsTitle')}
          </h2>
        </div>

        {/* Ticket Type List (Brutalist card layout) */}
        <div className="space-y-4 mb-8">
          {visibleTicketTypes.map((ticket) => {
            const status = getTicketStatus(ticket);
            const isSelected = selectedTicketId === ticket.id;

            return (
              <button
                key={ticket.id}
                disabled={!status.available}
                onClick={() => {
                  setSelectedTicketId(ticket.id);
                  setTicketsCount(1);
                }}
                className={`w-full text-left p-6 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none cursor-pointer brut-border disabled:opacity-30 disabled:cursor-not-allowed ${isSelected
                  ? 'border-accent bg-accent/5 shadow-[4px_4px_0_0_var(--accent)] translate-x-[-2px] translate-y-[-2px]'
                  : 'border-border bg-surface hover:border-text-muted'
                  }`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                      {ticket.name}
                    </span>
                    {!status.available && (
                      <span className="text-[9px] font-mono uppercase tracking-wider border border-accent/40 text-accent bg-accent/5 px-2.5 py-0.5">
                        {status.key ? t(status.key) : status.label}
                      </span>
                    )}
                  </div>
                  {ticket.description && (
                    <p className="text-xs text-text-muted mt-2 font-sans">{ticket.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 sm:mt-0">
                  <span
                    className={`font-mono text-base font-bold ${isSelected ? 'text-accent' : 'text-text-muted'
                      }`}
                  >
                    {ticket.price > 0 ? `${ticket.price.toFixed(2)}€` : t('storefront.free')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quantity and Checkout widget */}
        {selectedTicket && (
          <div className="bg-surface brut-border p-6 space-y-6">
            {/* Quantity Selector */}
            <div className="flex items-center justify-between">
              <div>
                <span className="block font-mono text-[12px] text-text-muted uppercase tracking-widest">
                  {t('checkout.quantityLabel')}
                </span>
                <span className="text-[12px] text-text-faint font-mono">
                  {t('storefront.limitPerPurchase', { limit: maxBuyLimit })}
                </span>
              </div>
 
               <div className="flex items-center gap-4">
                 <button
                   type="button"
                   disabled={isSoldOut || ticketsCount <= 1}
                   onClick={() => setTicketsCount(Math.max(1, ticketsCount - 1))}
                   className="w-9 h-9 border-2 border-border flex items-center justify-center text-text hover:text-accent hover:border-accent transition-colors disabled:opacity-20 bg-transparent font-bold cursor-pointer"
                 >
                   <Minus size={14} />
                 </button>
                 <span className="font-mono text-base font-bold text-white w-6 text-center">
                   {ticketsCount}
                 </span>
                 <button
                   type="button"
                   disabled={isSoldOut || ticketsCount >= maxBuyLimit}
                   onClick={() => setTicketsCount(Math.min(maxBuyLimit, ticketsCount + 1))}
                   className="w-9 h-9 border-2 border-border flex items-center justify-center text-text hover:text-accent hover:border-accent transition-colors disabled:opacity-20 bg-transparent font-bold cursor-pointer"
                 >
                   <Plus size={14} />
                 </button>
               </div>
             </div>
 
             {/* Price breakdown */}
             <div className="border-t-2 border-border pt-4 flex items-baseline justify-between">
               <span className="font-mono text-[12px] text-text-muted uppercase tracking-widest">
                 {t('checkout.total')}
               </span>
               <span className="font-mono text-2xl font-bold text-accent">
                 {totalPrice}€
               </span>
             </div>
 
             {/* Purchase CTA */}
             <button
               disabled={isSoldOut}
               onClick={onCheckout}
               className="brut-btn w-full flex items-center justify-center gap-2.5"
             >
               {isSoldOut ? (
                 selectedStatus.key ? t(selectedStatus.key) : selectedStatus.label
               ) : (
                 <>
                   {t('checkout.buyButton')} <ArrowRight size={14} />
                 </>
               )}
             </button>
           </div>
         )}
 
         <div className="text-center mt-6">
           <p className="font-mono text-[9px] text-text-faint uppercase tracking-widest">
             {t('storefront.digitalDeliveryNotice')}
           </p>
         </div>
      </div>
    </section>
  );
}
