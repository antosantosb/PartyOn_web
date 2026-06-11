import React from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface TicketTypeDraft {
  id?: string;
  name: string;
  price: number;
  maxStock: number;
  soldCount: number;
  saleStartsAt: string;
  saleEndsAt: string;
  forceSoldOut: boolean;
  isDoorType?: boolean;
  _key: number;
}

interface TicketTypesConfigProps {
  ticketTypes: TicketTypeDraft[];
  ticketError: string | null;
  primaryColor: string;
  addTicketType: () => void;
  updateTicketType: (key: number, field: keyof Omit<TicketTypeDraft, '_key'>, value: any) => void;
  removeTicketType: (key: number) => void;
}

export function TicketTypesConfig({
  ticketTypes,
  ticketError,
  primaryColor,
  addTicketType,
  updateTicketType,
  removeTicketType,
}: TicketTypesConfigProps) {
  const inputClass = "w-full bg-[#1a1a1a] border border-white/8 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-white/25 transition-colors placeholder-white/20";
  const labelClass = "block text-xs font-mono text-white/40 uppercase tracking-wider mb-2";

  return (
    <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-white/6">
        <p className="text-sm font-semibold text-white/60">Tipos de Entrada</p>
        <button
          type="button"
          onClick={addTicketType}
          className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5 cursor-pointer"
          style={{ borderColor: `${primaryColor}30`, color: primaryColor }}
        >
          <Plus className="w-3.5 h-3.5" /> Añadir tipo
        </button>
      </div>

      {ticketTypes.length === 0 && (
        <p className="text-sm text-white/20 text-center py-4">
          No hay tipos de entrada. Haz clic en <span className="font-mono">+ Añadir tipo</span>.
        </p>
      )}

      <div className="space-y-3">
        {ticketTypes.map((tt) => (
          <div key={tt._key} className="bg-[#0c0c0c] border border-white/6 rounded-xl p-4 space-y-3">
            {/* Row 1: Name + delete */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={tt.name || ''}
                onChange={e => updateTicketType(tt._key, 'name', e.target.value)}
                placeholder="Nombre (ej: Pre-venta, General, VIP)"
                className="flex-1 bg-[#1a1a1a] border border-white/8 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/25 transition-colors placeholder-white/20 font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  if (tt.isDoorType) {
                    alert("No es posible borrar la entrada oficial de puerta (En Puerta) ya que es obligatoria.");
                    return;
                  }
                  if (tt.soldCount > 0) {
                    if (window.confirm(`Ya han sido vendidas ${tt.soldCount} entradas de este tipo. Eliminarlo no eliminará estas entradas, solo lo ocultará de la tienda.`)) {
                      removeTicketType(tt._key);
                    }
                  } else {
                    removeTicketType(tt._key);
                  }
                }}
                className="text-white/20 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/8 cursor-pointer"
                title="Eliminar tipo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Row 2: Price + maxStock */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Precio (€)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-mono">€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={tt.price === undefined || tt.price === null ? '' : tt.price}
                    onChange={e => updateTicketType(tt._key, 'price', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1a1a1a] border border-white/8 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/25 transition-colors font-mono"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Capacidad máxima</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={tt.maxStock === undefined || tt.maxStock === null ? '' : tt.maxStock}
                    onChange={e => updateTicketType(tt._key, 'maxStock', parseInt(e.target.value) || 0)}
                    className="w-full bg-[#1a1a1a] border border-white/8 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/25 transition-colors font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">uds</span>
                </div>
              </div>
            </div>

            {/* Row 3: Sale window */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Inicio de venta</label>
                <input type="datetime-local" value={tt.saleStartsAt || ''} onChange={e => updateTicketType(tt._key, 'saleStartsAt', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fin de venta</label>
                <input type="datetime-local" value={tt.saleEndsAt || ''} onChange={e => updateTicketType(tt._key, 'saleEndsAt', e.target.value)} className={inputClass} />
              </div>
            </div>

            {/* Row 4: Force sold out toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tt.forceSoldOut}
                onChange={e => updateTicketType(tt._key, 'forceSoldOut', e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-[#1a1a1a] accent-red-500"
              />
              <span className="text-xs text-white/50">Forzar Agotado</span>
            </label>

            {/* Summary chips */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded"
                style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}>
                {tt.price > 0 ? `${tt.price.toFixed(2)}€` : 'Gratis'}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/40">
                Vendidas: {tt.soldCount} / {tt.maxStock}
              </span>
              {(tt.forceSoldOut || (tt.soldCount >= tt.maxStock)) && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-500/15 text-red-400">
                  Agotado
                </span>
              )}
              {tt.id && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/20">
                  id: {tt.id.slice(-6)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-white/6 text-xs text-white/20 space-y-1">
        <p>• El botón <span className="font-mono">⊝</span> solo elimina tipos sin entradas vendidas.</p>
        <p>• Reducir el límite por debajo de las ventas actuales no está permitido.</p>
      </div>
    </div>
  );
}
