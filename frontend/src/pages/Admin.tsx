import { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import {
  Settings, Save, Image as ImageIcon, ArrowLeft,
  CheckCircle2, Loader2, Plus, Trash2, AlertCircle, Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:3000/api';

interface TicketTypeDraft {
  id?: string;
  name: string;
  price: number;
  stock: number;
  _key: number; // local key for React list rendering
}

let keyCounter = 0;
const nextKey = () => ++keyCounter;

export default function Admin() {
  const store = useStore();

  const [draft, setDraft] = useState({
    event: store.eventData,
    theme: store.theme
  });
  const [ticketTypes, setTicketTypes] = useState<TicketTypeDraft[]>([]);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const initialized = useRef(false);

  // Populate draft exactly once when backend data arrives
  useEffect(() => {
    if (!store.loading && !initialized.current) {
      initialized.current = true;
      setDraft({ event: store.eventData, theme: store.theme });
      setTicketTypes(
        store.eventData.ticketTypes.map(tt => ({ ...tt, _key: nextKey() }))
      );
    }
  }, [store.loading, store.eventData, store.theme]);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = async () => {
    setTicketError(null);

    // Validate ticket types before saving
    for (const tt of ticketTypes) {
      if (!tt.name.trim()) return setTicketError('Todos los tipos de entrada necesitan nombre.');
      if (isNaN(tt.price) || tt.price < 0) return setTicketError(`Precio inválido en "${tt.name || 'sin nombre'}"`);
      if (isNaN(tt.stock) || tt.stock < 0) return setTicketError(`Stock inválido en "${tt.name || 'sin nombre'}"`);
    }

    setSaveStatus('saving');
    try {
      await store.setEventData(draft.event);
      await store.setTheme(draft.theme);

      // Save ticket types separately (upsert)
      if (draft.event.id) {
        const res = await fetch(`${API_BASE}/ticket-types`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: draft.event.id,
            ticketTypes: ticketTypes.map(({ _key, ...tt }) => tt)
          })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error en ticket types');
        // Update local draft with server-assigned IDs for new types
        const updatedTickets = data.ticketTypes.map((tt: any) => ({ ...tt, _key: nextKey() }));
        setTicketTypes(updatedTickets);

        // Crucial: Update the store so Customer.tsx sees the new tickets immediately
        // We strip the local _key before pushing to store
        await store.setEventData({
          ...draft.event,
          ticketTypes: data.ticketTypes
        });
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e: any) {
      setSaveStatus('idle');
      setTicketError(e.message || 'Error al guardar. Comprueba el backend.');
    }
  };

  // Ticket type helpers
  const addTicketType = () =>
    setTicketTypes(prev => [...prev, { name: '', price: 0, stock: 100, _key: nextKey() }]);

  const updateTicketType = (key: number, field: keyof Omit<TicketTypeDraft, '_key'>, value: string | number) =>
    setTicketTypes(prev => prev.map(tt => tt._key === key ? { ...tt, [field]: value } : tt));

  const removeTicketType = (key: number) =>
    setTicketTypes(prev => prev.filter(tt => tt._key !== key));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${API_BASE}/upload-image`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) {
        setDraft(d => ({ ...d, theme: { ...d.theme, backgroundImage: data.url } }));
      } else {
        alert('Error al subir la imagen: ' + (data.error || 'desconocido'));
      }
    } catch {
      alert('No se pudo conectar con el servidor para subir la imagen.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const ev = (key: string, value: string) =>
    setDraft(d => ({ ...d, event: { ...d.event, [key]: value } }));

  const th = (key: string, value: string) =>
    setDraft(d => ({ ...d, theme: { ...d.theme, [key]: value } }));

  const inputClass = "w-full bg-[#1a1a1a] border border-white/8 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-white/25 transition-colors placeholder-white/20";
  const labelClass = "block text-xs font-mono text-white/40 uppercase tracking-wider mb-2";

  const d = draft.event;
  const t = draft.theme;

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ─── Sticky top bar ──────────────────────────────────── */}
      <div className="border-b border-white/8 sticky top-0 z-10 bg-[#0c0c0c]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-white/30 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
              <ArrowLeft className="w-4 h-4" /> Tienda
            </Link>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" style={{ color: t.primaryColor }} />
              <span className="font-semibold text-sm">Backoffice</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" target="_blank"
              className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider hidden sm:block">
              Ver Tienda ↗
            </Link>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-60 hover:brightness-110 active:scale-95"
              style={{ backgroundColor: t.primaryColor, color: '#000' }}
            >
              {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
              {saveStatus === 'saved' && <CheckCircle2 className="w-4 h-4" />}
              {saveStatus === 'idle' && <Save className="w-4 h-4" />}
              {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado ✓' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {store.loading && (
          <div className="flex items-center gap-2 text-white/30 text-sm mb-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando datos del evento...
          </div>
        )}

        {/* Two-column layout: Left = visual/editorial, Right = technical/tickets */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

          {/* ══════════════════════════════════════════════════════
              LEFT COLUMN — VISUAL / EDITORIAL
          ══════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            <h2 className="text-xs font-mono text-white/30 uppercase tracking-[0.2em]">
              Estética & Contenido
            </h2>

            {/* Logo */}
            <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
              <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6">Logo</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Texto Izquierda</label>
                  <input type="text" value={d.logoText1 || ''} onChange={e => ev('logoText1', e.target.value)} className={inputClass} placeholder="PARTY" />
                </div>
                <div>
                  <label className={labelClass}>Texto Derecha <span className="normal-case text-white/20">(acento)</span></label>
                  <input type="text" value={d.logoText2 || ''} onChange={e => ev('logoText2', e.target.value)} className={inputClass} placeholder="ON" />
                </div>
              </div>
              <div className="pt-1 text-lg font-bold">
                <span className="text-white">{d.logoText1 || 'PARTY'}</span>
                <span style={{ color: t.primaryColor }}>{d.logoText2 || 'ON'}</span>
              </div>
            </div>

            {/* Event info */}
            <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
              <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6">Info del Evento</p>
              <div>
                <label className={labelClass}>Nombre de la Fiesta</label>
                <input type="text" value={d.partyName || ''} onChange={e => ev('partyName', e.target.value)} className={inputClass} placeholder="EL PERREO INTENSO" />
              </div>
              <div>
                <label className={labelClass}>Tagline <span className="normal-case text-white/20">(subtítulo)</span></label>
                <input type="text" value={d.tagline || ''} onChange={e => ev('tagline', e.target.value)} className={inputClass} placeholder="La noche que no olvidarás" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input type="text" value={d.date || ''} onChange={e => ev('date', e.target.value)} className={inputClass} placeholder="SÁB 15 NOV" />
                </div>
                <div>
                  <label className={labelClass}>Ubicación</label>
                  <input type="text" value={d.location || ''} onChange={e => ev('location', e.target.value)} className={inputClass} placeholder="Club Nostalgia, Madrid" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Lineup <span className="normal-case text-white/20">(separado por comas)</span></label>
                <input type="text" value={d.lineup || ''} onChange={e => ev('lineup', e.target.value)} className={inputClass} placeholder="DJ Álvaro, MC Regueton, La Reina Latina" />
                {d.lineup && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {d.lineup.split(',').filter(Boolean).map((a: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded border"
                        style={{ borderColor: `${t.primaryColor}30`, color: t.primaryColor, backgroundColor: `${t.primaryColor}08` }}>
                        {a.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Colors */}
            <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-5">
              <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6">Colores</p>
              <div>
                <label className={labelClass}>Color de Acento</label>
                <div className="flex gap-3 items-center">
                  <input type="color" value={t.primaryColor} onChange={e => th('primaryColor', e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent" />
                  <input type="text" value={t.primaryColor} onChange={e => th('primaryColor', e.target.value)} className={`${inputClass} font-mono uppercase flex-1`} />
                </div>
                <p className="text-xs text-white/20 mt-1">Stripe lateral, botones, tags del lineup</p>
              </div>
              <div>
                <label className={labelClass}>Color Secundario</label>
                <div className="flex gap-3 items-center">
                  <input type="color" value={t.secondaryColor} onChange={e => th('secondaryColor', e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent" />
                  <input type="text" value={t.secondaryColor} onChange={e => th('secondaryColor', e.target.value)} className={`${inputClass} font-mono uppercase flex-1`} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: t.primaryColor }} />
                <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: t.secondaryColor }} />
              </div>
            </div>

            {/* Background image */}
            <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
              <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6 flex items-center justify-between">
                Imagen de Fondo <ImageIcon className="w-4 h-4 text-white/20" />
              </p>
              <div>
                <label className={labelClass}>Subir desde el ordenador</label>
                <label className={`flex items-center justify-center gap-3 w-full py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${isUploading ? 'opacity-50 cursor-wait' : 'border-white/10 hover:border-white/25'}`}>
                  {isUploading
                    ? <><Loader2 className="w-4 h-4 animate-spin text-white/40" /><span className="text-sm text-white/40">Subiendo...</span></>
                    : <><ImageIcon className="w-4 h-4 text-white/30" /><span className="text-sm text-white/40">Haz clic para seleccionar</span><span className="text-xs text-white/20">(máx. 8 MB)</span></>
                  }
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                </label>
              </div>
              <div>
                <label className={labelClass}>O pegar una URL externa</label>
                <input type="text" value={t.backgroundImage || ''} onChange={e => th('backgroundImage', e.target.value)} className={inputClass} placeholder="https://images.unsplash.com/photo-..." />
              </div>
              {/* Live preview */}
              <div className="rounded-lg overflow-hidden h-32 relative">
                <div className="absolute inset-0" style={{ backgroundImage: `url(${t.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.45)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(12,12,12,0.95) 100%)' }} />
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: t.primaryColor }} />
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  <p className="text-[9px] font-mono uppercase tracking-[0.25em] mb-0.5" style={{ color: t.primaryColor }}>Preview</p>
                  <p className="text-white font-bold text-sm leading-tight">{d.partyName || 'Nombre del Evento'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              RIGHT COLUMN — TECHNICAL / TICKETS
          ══════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            <h2 className="text-xs font-mono text-white/30 uppercase tracking-[0.2em]">
              Entradas & Precios
            </h2>

            <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/6">
                <p className="text-sm font-semibold text-white/60">Tipos de Entrada</p>
                <button
                  onClick={addTicketType}
                  className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
                  style={{ borderColor: `${t.primaryColor}30`, color: t.primaryColor }}
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir tipo
                </button>
              </div>

              {ticketError && (
                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{ticketError}</span>
                </div>
              )}

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
                        value={tt.name}
                        onChange={e => updateTicketType(tt._key, 'name', e.target.value)}
                        placeholder="Nombre (ej: Pre-venta, General, VIP)"
                        className="flex-1 bg-[#1a1a1a] border border-white/8 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/25 transition-colors placeholder-white/20 font-medium"
                      />
                      <button
                        onClick={() => removeTicketType(tt._key)}
                        className="text-white/20 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/8"
                        title="Eliminar tipo (solo si no hay entradas vendidas)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Row 2: Price + Stock */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Precio (€)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-mono">€</span>
                          <input
                            type="number"
                            min="0"
                            step="0.50"
                            value={tt.price}
                            onChange={e => updateTicketType(tt._key, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#1a1a1a] border border-white/8 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/25 transition-colors font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Límite de venta</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={tt.stock}
                            onChange={e => updateTicketType(tt._key, 'stock', parseInt(e.target.value) || 0)}
                            className="w-full bg-[#1a1a1a] border border-white/8 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/25 transition-colors font-mono"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">uds</span>
                        </div>
                      </div>
                    </div>



                    {/* Summary chips */}
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded"
                        style={{ backgroundColor: `${t.primaryColor}12`, color: t.primaryColor }}>
                        {tt.price > 0 ? `${tt.price.toFixed(2)}€` : 'Gratis'}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/40">
                        {tt.stock > 0 ? `${tt.stock} disponibles` : 'Agotado'}
                      </span>
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

            {/* Email Personalization */}
            <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
              <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6 flex items-center justify-between">
                Personalización de Email <Mail className="w-4 h-4 text-white/20" />
              </p>
              <div>
                <label className={labelClass}>Asunto del Correo</label>
                <input
                  type="text"
                  value={d.emailSubject || ''}
                  onChange={e => ev('emailSubject', e.target.value)}
                  className={inputClass}
                  placeholder="Tu entrada para..."
                />
              </div>
              <div>
                <label className={labelClass}>Mensaje del Correo <span className="normal-case text-white/20">(Markdown compatible)</span></label>
                <textarea
                  rows={4}
                  value={d.emailBody || ''}
                  onChange={e => ev('emailBody', e.target.value)}
                  className={`${inputClass} resize-none`}
                  placeholder="Gracias por tu compra..."
                />
                <p className="text-[10px] text-white/20 mt-2">Este mensaje aparecerá arriba de los adjuntos PDF.</p>
              </div>
            </div>

            {/* Resumen visual del evento */}
            <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-3">
              <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6">Resumen del Evento</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">Nombre</span>
                  <span className="font-medium">{d.partyName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Fecha</span>
                  <span className="font-mono text-xs text-white/70">{d.date || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Lugar</span>
                  <span className="text-white/70 text-xs">{d.location || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Entradas</span>
                  <span className="font-medium">{ticketTypes.length} tipos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Total disponible</span>
                  <span className="font-medium" style={{ color: t.primaryColor }}>
                    {ticketTypes.reduce((sum, tt) => sum + (tt.stock || 0), 0)} uds
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
