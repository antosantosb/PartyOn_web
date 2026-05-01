import { useState, useEffect } from 'react';
import { Save, Trash2, Plus, ImageIcon, Loader2, Mail, Layout, Type, Palette, Calendar, MapPin, List, Eye, Settings, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatInTimeZone } from 'date-fns-tz';

import { apiFetch } from '../../lib/api-client';



interface TicketTypeDraft {
  id?: string;
  name: string;
  price: number;
  maxStock: number;
  soldCount: number;
  saleStartsAt: string;
  saleEndsAt: string;
  forceSoldOut: boolean;
  _key: number;
}

let keyCounter = 0;
const nextKey = () => ++keyCounter;

export default function Admin() {
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const [draft, setDraft] = useState<any>({ event: {}, theme: {} });
  const [ticketTypes, setTicketTypes] = useState<TicketTypeDraft[]>([]);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const res = await apiFetch('/admin/events');
      const data = await res.json();

      if (data.events && data.events.length > 0) {
        const sorted = [...data.events].sort((a: any, b: any) => {
          if (a.status === 'ACTIVE') return -1;
          if (b.status === 'ACTIVE') return 1;
          return 0;
        });
        setAllEvents(sorted);

        // Ensure we maintain selection if reloading
        const evtToSelect = selectedEventId
          ? (data.events.find((e: any) => e.id === selectedEventId) || data.events[0])
          : data.events[0];

        selectEvent(evtToSelect);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const selectEvent = (evt: any) => {
    setSelectedEventId(evt.id);
    setDraft({ event: { ...evt, partyName: evt.name }, theme: evt.theme || { primaryColor: '#00ffcc', secondaryColor: '#ff007f' } });
    setTicketTypes(evt.ticketTypes?.map((tt: any) => ({
      ...tt,
      saleStartsAt: tt.saleStartsAt ? formatInTimeZone(new Date(tt.saleStartsAt), 'Europe/Lisbon', "yyyy-MM-dd'T'HH:mm") : '',
      saleEndsAt: tt.saleEndsAt ? formatInTimeZone(new Date(tt.saleEndsAt), 'Europe/Lisbon', "yyyy-MM-dd'T'HH:mm") : '',
      _key: nextKey()
    })) || []);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const evt = allEvents.find(x => x.id === e.target.value);
    if (evt) selectEvent(evt);
  };

  const createNewEvent = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/events', { method: 'POST' });
      const data = await res.json();

      if (data.event) {
        await fetchEvents();
        selectEvent(data.event);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!draft.event?.id) return;
    if (!window.confirm("¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.")) return;

    setLoading(true);
    try {
      const res = await apiFetch(`/admin/events/${draft.event.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        await fetchEvents();
      } else {
        alert(data.error || 'Error al eliminar el evento');
        setLoading(false);
      }
    } catch (e) {
      alert('Error de conexión al eliminar');
      setLoading(false);
    }
  };

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setTicketError(null);

    // 1. Defensively check Event dates
    const eventStartsAt = draft.event?.startsAt;
    const eventEndsAt = draft.event?.endsAt;

    if (eventStartsAt && eventEndsAt) {
      const start = new Date(eventStartsAt).getTime();
      const end = new Date(eventEndsAt).getTime();

      if (!isNaN(start) && !isNaN(end) && end < start) {
        setTicketError("Error: La fecha de finalización del evento no puede ser anterior a la de inicio.");
        return;
      }
    }

    // 2. Validate ticket types before saving
    for (const tt of ticketTypes) {
      if (!tt.name?.trim()) {
        setTicketError('Todos los tipos de entrada necesitan nombre.');
        return;
      }
      if (typeof tt.price !== 'number' || tt.price < 0) {
        setTicketError(`Precio inválido en "${tt.name}"`);
        return;
      }
      if (typeof tt.maxStock !== 'number' || tt.maxStock < 0) {
        setTicketError(`Capacidad inválida en "${tt.name}"`);
        return;
      }

      // Safe check: Ticket sale window vs Event window
      if (tt.saleEndsAt && eventEndsAt) {
        const ticketEnd = new Date(tt.saleEndsAt).getTime();
        const eventEnd = new Date(eventEndsAt).getTime();

        if (!isNaN(ticketEnd) && !isNaN(eventEnd) && ticketEnd > eventEnd) {
          setTicketError(`Error: Las entradas de "${tt.name}" no pueden venderse después de que el evento haya terminado.`);
          return;
        }
      }

      if (tt.saleStartsAt && eventStartsAt) {
        const ticketStart = new Date(tt.saleStartsAt).getTime();
        const eventStart = new Date(eventStartsAt).getTime();
        if (!isNaN(ticketStart) && !isNaN(eventStart) && ticketStart > eventStart) {
          setTicketError(`Error: Las entradas de "${tt.name}" no pueden venderse después del inicio del evento.`);
          return;
        }
      }

      if (tt.saleStartsAt && tt.saleEndsAt) {
        const ticketStart = new Date(tt.saleStartsAt).getTime();
        const ticketEnd = new Date(tt.saleEndsAt).getTime();
        if (!isNaN(ticketStart) && !isNaN(ticketEnd) && ticketStart > ticketEnd) {
          setTicketError(`Error: El periodo de venta de "${tt.name}" no puede terminar antes de que empiece.`);
          return;
        }
        if (ticketStart < Date.now()) {
          setTicketError(`Error: El periodo de venta de "${tt.name}" no puede empezar en el pasado.`);
          return;
        }
        if (ticketEnd < Date.now()) {
          setTicketError(`Error: El periodo de venta de "${tt.name}" no puede terminar en el pasado.`);
          return;
        }

      }

    }

    // 3. Safety Interceptor for ACTIVE events
    if (draft.event?.status === 'ACTIVE') {
      const confirmed = window.confirm("El evento ya está online, entradas compradas anteriormente no estarán sujetas a este cambio. ¿Continuar?");
      if (!confirmed) return;
    }

    // 4. Execution
    setSaveStatus('saving');
    try {
      const res = await apiFetch('/store-data', {
        method: 'POST',
        body: JSON.stringify({ eventData: draft.event, theme: draft.theme })
      });

      if (res.status === 409) {
        const errorData = await res.json();
        const msg = `Solo puedes tener una fiesta en activo, ¿quieres poner ${errorData.activeEventName} como terminada?`;
        if (window.confirm(msg)) {
          const resRetry = await apiFetch('/store-data', {
            method: 'POST',
            body: JSON.stringify({ eventData: draft.event, theme: draft.theme, resolveConflict: true })
          });
          if (!resRetry.ok) {
            setSaveStatus('idle');
            setTicketError('Error al guardar el evento tras resolver conflicto.');
            return;
          }
        } else {
          setSaveStatus('idle');
          return;
        }
      } else if (!res.ok) {
        setSaveStatus('idle');
        setTicketError('Error al guardar el evento en el servidor.');
        return;
      }

      // Save ticket types separately
      if (draft.event?.id) {
        const resTickets = await apiFetch('/ticket-types', {
          method: 'POST',
          body: JSON.stringify({
            eventId: draft.event.id,
            ticketTypes: ticketTypes.map(({ _key, ...tt }) => tt)
          })
        });
        const dataTickets = await resTickets.json();
        if (!dataTickets.success) {
          setSaveStatus('idle');
          setTicketError(dataTickets.error || 'Error al guardar los tipos de entrada.');
          return;
        }

        await fetchEvents();
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e: any) {
      setSaveStatus('idle');
      setTicketError('Error de red o servidor al intentar guardar. Comprueba la conexión.');
      console.error('[handleSave] Crash prevented:', e);
    }
  };

  // Ticket type helpers
  const addTicketType = () =>
    setTicketTypes(prev => [...prev, { name: '', price: 0, maxStock: 100, soldCount: 0, saleStartsAt: '', saleEndsAt: '', forceSoldOut: false, _key: nextKey() }]);

  const updateTicketType = (key: number, field: keyof Omit<TicketTypeDraft, '_key'>, value: any) =>
    setTicketTypes(prev => prev.map(tt => tt._key === key ? { ...tt, [field]: value } : tt));

  const removeTicketType = (key: number) =>
    setTicketTypes(prev => prev.filter(tt => tt._key !== key));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'backgroundImage' | 'backgroundImageMobile') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await apiFetch('/upload-image', { method: 'POST', body: form });
      const data = await res.json();

      if (data.url) {
        setDraft((d: any) => ({ ...d, theme: { ...d.theme, [field]: data.url } }));
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
    setDraft((d: any) => ({ ...d, event: { ...d.event, [key]: value } }));

  const th = (key: string, value: string) =>
    setDraft((d: any) => ({ ...d, theme: { ...d.theme, [key]: value } }));

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
              <Settings className="w-4 h-4" style={{ color: t?.primaryColor || '#00ffcc' }} />
              <select
                value={selectedEventId}
                onChange={handleSelectChange}
                className="bg-transparent border border-white/10 rounded px-2 py-1 text-sm font-semibold focus:outline-none focus:bg-black w-48 truncate"
              >
                {allEvents.map(e => <option key={e.id} value={e.id} className="bg-black">{e.name} ({e.status})</option>)}
              </select>
              <button onClick={createNewEvent} className="ml-2 text-xs border border-white/20 px-2 py-1 rounded hover:bg-white/10 transition-colors flex items-center gap-1">
                <Plus className="w-3 h-3" /> Nuevo
              </button>
              {draft.event?.status === 'DRAFT' && (
                <button onClick={handleDeleteEvent} className="ml-2 text-xs border border-red-500/50 text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-colors flex items-center gap-1" title="Eliminar Borrador">
                  <Trash2 className="w-3 h-3" /> Eliminar
                </button>
              )}
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
        {loading && (
          <div className="flex items-center gap-2 text-white/30 text-sm mb-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando eventos...
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Estado</label>
                  <select
                    value={d.status || 'DRAFT'}
                    onChange={e => ev('status', e.target.value)}
                    className={inputClass}
                  >
                    <option value="DRAFT">Borrador (Oculto)</option>
                    <option value="ACTIVE">Activo (Público)</option>
                    <option value="COMPLETED">Completado</option>
                    <option value="ARCHIVED">Archivado</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tagline <span className="normal-case text-white/20">(subtítulo)</span></label>
                  <input type="text" value={d.tagline || ''} onChange={e => ev('tagline', e.target.value)} className={inputClass} placeholder="La noche que no olvidarás" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Fecha <span className="normal-case text-white/20">(texto UI)</span></label>
                  <input type="text" value={d.date || ''} onChange={e => ev('date', e.target.value)} className={inputClass} placeholder="SÁB 15 NOV" />
                </div>
                <div>
                  <label className={labelClass}>Ubicación</label>
                  <input type="text" value={d.location || ''} onChange={e => ev('location', e.target.value)} className={inputClass} placeholder="Club Nostalgia, Madrid" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Horario de inicio <span className="normal-case text-white/20">(hora real)</span></label>
                  <input type="datetime-local" value={d.startsAt ? formatInTimeZone(new Date(d.startsAt), 'Europe/Lisbon', "yyyy-MM-dd'T'HH:mm") : ''} onChange={e => ev('startsAt', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Horario de cierre <span className="normal-case text-white/20">(hora real)</span></label>
                  <input type="datetime-local" value={d.endsAt ? formatInTimeZone(new Date(d.endsAt), 'Europe/Lisbon', "yyyy-MM-dd'T'HH:mm") : ''} onChange={e => ev('endsAt', e.target.value)} className={inputClass} />
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

            {/* Background images */}
            <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
              <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6 flex items-center justify-between">
                Imágenes de Fondo <ImageIcon className="w-4 h-4 text-white/20" />
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Desktop Background */}
                <div>
                  <label className={labelClass}>Desktop (PC)</label>
                  <label className={`flex flex-col items-center justify-center gap-2 w-full py-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${isUploading ? 'opacity-50 cursor-wait' : 'border-white/10 hover:border-white/25'}`}>
                    {isUploading
                      ? <><Loader2 className="w-4 h-4 animate-spin text-white/40" /><span className="text-sm text-white/40">Subiendo...</span></>
                      : t.backgroundImage
                        ? <><CheckCircle2 className="w-5 h-5 text-green-500" /><span className="text-xs text-white/50">Cambiar imagen</span></>
                        : <><Plus className="w-5 h-5 text-white/20" /><span className="text-xs text-white/40">Subir imagen</span></>
                    }
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'backgroundImage')} disabled={isUploading} />
                  </label>
                  {t.backgroundImage && (
                    <div className="mt-2 relative group">
                      <img src={t.backgroundImage} className="w-full h-20 object-cover rounded-lg border border-white/10" alt="Preview" />
                      <button onClick={() => th('backgroundImage', '')} className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile Background */}
                <div>
                  <label className={labelClass}>Mobile (Móvil)</label>
                  <label className={`flex flex-col items-center justify-center gap-2 w-full py-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${isUploading ? 'opacity-50 cursor-wait' : 'border-white/10 hover:border-white/25'}`}>
                    {isUploading
                      ? <><Loader2 className="w-4 h-4 animate-spin text-white/40" /><span className="text-sm text-white/40">Subiendo...</span></>
                      : t.backgroundImageMobile
                        ? <><CheckCircle2 className="w-5 h-5 text-green-500" /><span className="text-xs text-white/50">Cambiar imagen</span></>
                        : <><Plus className="w-5 h-5 text-white/20" /><span className="text-xs text-white/40">Subir imagen</span></>
                    }
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'backgroundImageMobile')} disabled={isUploading} />
                  </label>
                  {t.backgroundImageMobile && (
                    <div className="mt-2 relative group">
                      <img src={t.backgroundImageMobile} className="w-full h-20 object-cover rounded-lg border border-white/10" alt="Preview Mobile" />
                      <button onClick={() => th('backgroundImageMobile', '')} className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Live preview */}
              <div className="rounded-lg overflow-hidden h-32 relative mt-4">
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
                        onClick={() => {
                          if (tt.soldCount > 0) {
                            if (window.confirm(`Ya han sido vendidas ${tt.soldCount} entradas de este tipo. Eliminarlo no eliminará estas entradas, solo lo ocultará de la tienda.`)) {
                              removeTicketType(tt._key);
                            }
                          } else {
                            removeTicketType(tt._key);
                          }
                        }}
                        className="text-white/20 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/8"
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
                            value={tt.price}
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
                            value={tt.maxStock}
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
                        style={{ backgroundColor: `${t.primaryColor}12`, color: t.primaryColor }}>
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
                  <span className="text-white/40">Capacidad total</span>
                  <span className="font-medium" style={{ color: t.primaryColor }}>
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
          </div>

        </div>
      </div>
    </div>
  );
}
