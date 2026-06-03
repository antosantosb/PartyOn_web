import React from 'react';

interface TicketTypeDraft {
  maxStock: number;
  soldCount: number;
}

interface SummaryConfigProps {
  partyName: string;
  date: string;
  location: string;
  primaryColor: string;
  ticketTypes: TicketTypeDraft[];
}

export function SummaryConfig({
  partyName,
  date,
  location,
  primaryColor,
  ticketTypes,
}: SummaryConfigProps) {
  return (
    <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-3">
      <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6">Resumen del Evento</p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-white/40">Nombre</span>
          <span className="font-medium">{partyName || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Fecha</span>
          <span className="font-mono text-xs text-white/70">{date || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Lugar</span>
          <span className="text-white/70 text-xs">{location || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Entradas</span>
          <span className="font-medium">{ticketTypes.length} tipos</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Capacidad total</span>
          <span className="font-medium" style={{ color: primaryColor }}>
            {ticketTypes.reduce((sum, tt) => sum + (tt.maxStock || 0), 0)} uds
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Vendidas</span>
          <span className="font-medium text-white/70">
            {ticketTypes.reduce((sum, tt) => sum + (tt.soldCount || 0), 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
