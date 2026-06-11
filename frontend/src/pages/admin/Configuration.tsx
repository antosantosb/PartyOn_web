import { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Loader2, Settings, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatInTimeZone } from 'date-fns-tz';

import { apiFetch } from '../../lib/api-client';
import { LogoConfig } from './LogoConfig';
import { EventInfoConfig } from './EventInfoConfig';
import { ColorsConfig } from './ColorsConfig';
import { BackgroundImagesConfig } from './BackgroundImagesConfig';
import { TicketTypesConfig } from './TicketTypesConfig';
import { EmailConfig } from './EmailConfig';
import { SummaryConfig } from './SummaryConfig';

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

let keyCounter = 0;
const nextKey = () => ++keyCounter;

export default function Admin() {
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const [draft, setDraft] = useState<any>({ event: {}, theme: {} });
  const [ticketTypes, setTicketTypes] = useState<TicketTypeDraft[]>([]);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [eventCalendarDate, setEventCalendarDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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

        const evtToSelect = selectedEventId
          ? (data.events.find((e: any) => e.id === selectedEventId) || data.events[0])
          : data.events[0];

        selectEvent(evtToSelect);
      } else {
        // Automatically initialize first event if database is empty
        const createRes = await apiFetch('/admin/events', { method: 'POST' });
        const createData = await createRes.json();
        if (createData.event) {
          const nextRes = await apiFetch('/admin/events');
          const nextData = await nextRes.json();
          if (nextData.events && nextData.events.length > 0) {
            setAllEvents(nextData.events);
            selectEvent(nextData.events[0]);
          }
        }
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
    setDraft({ event: { ...evt, partyName: evt.name }, theme: evt.theme || { primaryColor: '#00ffcc' } });
    
    const dateStr = evt.startsAt ? formatInTimeZone(new Date(evt.startsAt), 'Europe/Lisbon', 'yyyy-MM-dd') : '';
    const startTimeStr = evt.startsAt ? formatInTimeZone(new Date(evt.startsAt), 'Europe/Lisbon', 'HH:mm') : '';
    const endTimeStr = evt.endsAt ? formatInTimeZone(new Date(evt.endsAt), 'Europe/Lisbon', 'HH:mm') : '';
    
    setEventCalendarDate(dateStr);
    setEventStartTime(startTimeStr);
    setEventEndTime(endTimeStr);
    setErrors({});

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

    const newErrors: Record<string, string> = {};
    if (!draft.event?.partyName?.trim() && !draft.event?.name?.trim()) {
      newErrors.partyName = "este campo es obligatorio";
    }
    if (!draft.event?.date?.trim()) {
      newErrors.date = "este campo es obligatorio";
    }
    if (!draft.event?.location?.trim()) {
      newErrors.location = "este campo es obligatorio";
    }
    if (!eventCalendarDate) {
      newErrors.eventCalendarDate = "este campo es obligatorio";
    }
    if (!eventStartTime) {
      newErrors.eventStartTime = "este campo es obligatorio";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTicketError("Por favor, rellena todos los campos obligatorios.");
      return;
    }
    setErrors({});

    let isoStartsAt: string | null = null;
    let isoEndsAt: string | null = null;

    if (eventCalendarDate && eventStartTime) {
      const localStartStr = `${eventCalendarDate}T${eventStartTime}:00`;
      const startDate = new Date(localStartStr);
      if (!isNaN(startDate.getTime())) {
        isoStartsAt = startDate.toISOString();
      }
      
      if (eventEndTime) {
        let endCalendarDate = eventCalendarDate;
        if (eventEndTime < eventStartTime) {
          const d = new Date(eventCalendarDate);
          d.setDate(d.getDate() + 1);
          endCalendarDate = d.toISOString().split('T')[0];
        }
        const localEndStr = `${endCalendarDate}T${eventEndTime}:00`;
        const endDate = new Date(localEndStr);
        if (!isNaN(endDate.getTime())) {
          isoEndsAt = endDate.toISOString();
        }
      }
    }

    if (isoStartsAt && isoEndsAt) {
      const start = new Date(isoStartsAt).getTime();
      const end = new Date(isoEndsAt).getTime();

      if (!isNaN(start) && !isNaN(end) && end < start) {
        setTicketError("Error: La fecha de finalización del evento no puede ser anterior a la de inicio.");
        return;
      }
    }

    const updatedEvent = {
      ...draft.event,
      startsAt: isoStartsAt,
      endsAt: isoEndsAt
    };

    if (!updatedEvent.id) {
      setTicketError("Error: No se ha seleccionado ningún evento válido para guardar.");
      return;
    }

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

      if (tt.saleEndsAt && isoEndsAt) {
        const ticketEnd = new Date(tt.saleEndsAt).getTime();
        const eventEnd = new Date(isoEndsAt).getTime();

        if (!isNaN(ticketEnd) && !isNaN(eventEnd) && ticketEnd > eventEnd) {
          setTicketError(`Error: Las entradas de "${tt.name}" no pueden venderse después de que el evento haya terminado.`);
          return;
        }
      }

      if (tt.saleStartsAt && isoStartsAt) {
        const ticketStart = new Date(tt.saleStartsAt).getTime();
        const eventStart = new Date(isoStartsAt).getTime();
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
      }
    }

    if (updatedEvent.status === 'ACTIVE') {
      const confirmed = window.confirm("El evento ya está online, entradas compradas anteriormente no estarán sujetas a este cambio. ¿Continuar?");
      if (!confirmed) return;
    }

    setSaveStatus('saving');
    try {
      const res = await apiFetch('/store-data', {
        method: 'POST',
        body: JSON.stringify({ eventData: updatedEvent, theme: draft.theme })
      });

      if (res.status === 409) {
        const errorData = await res.json();
        const msg = `Solo puedes tener una fiesta en activo, ¿quieres poner ${errorData.activeEventName} como terminada?`;
        if (window.confirm(msg)) {
          const resRetry = await apiFetch('/store-data', {
            method: 'POST',
            body: JSON.stringify({ eventData: updatedEvent, theme: draft.theme, resolveConflict: true })
          });
          if (!resRetry.ok) {
            const errData = await resRetry.json().catch(() => ({}));
            setSaveStatus('idle');
            setTicketError(`Error al guardar el evento tras resolver conflicto: ${errData.error || errData.message || 'Desconocido'}`);
            return;
          }
        } else {
          setSaveStatus('idle');
          return;
        }
      } else if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setSaveStatus('idle');
        setTicketError(`Error al guardar el evento en el servidor: ${errData.error || errData.message || 'Desconocido'}`);
        return;
      }

      if (updatedEvent.id) {
        const resTickets = await apiFetch('/ticket-types', {
          method: 'POST',
          body: JSON.stringify({
            eventId: updatedEvent.id,
            ticketTypes: ticketTypes.map(({ _key, ...tt }) => ({
              ...tt,
              saleStartsAt: tt.saleStartsAt ? new Date(tt.saleStartsAt).toISOString() : null,
              saleEndsAt: tt.saleEndsAt ? new Date(tt.saleEndsAt).toISOString() : null
            }))
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

  const addTicketType = () =>
    setTicketTypes(prev => [...prev, { name: '', price: 0, maxStock: 100, soldCount: 0, saleStartsAt: '', saleEndsAt: '', forceSoldOut: false, _key: nextKey() }]);

  const updateTicketType = (key: number, field: keyof Omit<TicketTypeDraft, '_key'>, value: any) =>
    setTicketTypes(prev => prev.map(tt => tt._key === key ? { ...tt, [field]: value } : tt));

  const removeTicketType = (key: number) =>
    setTicketTypes(prev => prev.filter(tt => tt._key !== key));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'backgroundImage' | 'backgroundImageMobile' | 'logoText1') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await apiFetch('/upload-image', { method: 'POST', body: form });
      const data = await res.json();

      if (data.url) {
        if (field === 'logoText1') {
          setDraft((d: any) => ({ ...d, event: { ...d.event, logoText1: data.url } }));
        } else {
          setDraft((d: any) => ({ ...d, theme: { ...d.theme, [field]: data.url } }));
        }
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

  const d = draft.event || {};
  const t = draft.theme || {};

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
              {d.status === 'DRAFT' && (
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
              style={{ backgroundColor: t.primaryColor || '#00ffcc', color: '#000' }}
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

        {/* Global validation and save error banner at the top of the screen */}
        {ticketError && (
          <div className="flex items-start gap-2.5 text-sm text-red-400 bg-red-400/8 border border-red-400/20 rounded-xl px-4 py-3.5 mb-8">
            <span className="mt-0.5 flex-shrink-0 text-red-400">⚠</span>
            <div className="space-y-0.5">
              <p className="font-semibold">No se pudo guardar la configuración</p>
              <p className="text-white/60 text-xs">{ticketError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

          {/* LEFT COLUMN — VISUAL / EDITORIAL */}
          <div className="space-y-6">
            <h2 className="text-xs font-mono text-white/30 uppercase tracking-[0.2em]">
              Estética & Contenido
            </h2>

            <LogoConfig
              logoText1={d.logoText1 || ''}
              isUploading={isUploading}
              handleImageUpload={handleImageUpload}
              onChange={(val) => ev('logoText1', val)}
            />

            <EventInfoConfig
              partyName={d.partyName || ''}
              status={d.status || 'DRAFT'}
              tagline={d.tagline || ''}
              date={d.date || ''}
              location={d.location || ''}
              eventCalendarDate={eventCalendarDate}
              eventStartTime={eventStartTime}
              eventEndTime={eventEndTime}
              lineup={d.lineup || ''}
              tickerText={d.tickerText || ''}
              primaryColor={t.primaryColor || '#00ffcc'}
              errors={errors}
              onEventChange={ev}
              setEventCalendarDate={setEventCalendarDate}
              setEventStartTime={setEventStartTime}
              setEventEndTime={setEventEndTime}
            />

            <ColorsConfig
              primaryColor={t.primaryColor || ''}
              onThemeChange={th}
            />

            <BackgroundImagesConfig
              backgroundImage={t.backgroundImage || ''}
              backgroundImageMobile={t.backgroundImageMobile || ''}
              partyName={d.partyName || ''}
              primaryColor={t.primaryColor || '#00ffcc'}
              isUploading={isUploading}
              handleImageUpload={handleImageUpload}
              onThemeChange={th}
            />
          </div>

          {/* RIGHT COLUMN — TECHNICAL / TICKETS */}
          <div className="space-y-6">
            <h2 className="text-xs font-mono text-white/30 uppercase tracking-[0.2em]">
              Entradas & Precios
            </h2>

            <TicketTypesConfig
              ticketTypes={ticketTypes}
              ticketError={ticketError}
              primaryColor={t.primaryColor || '#00ffcc'}
              addTicketType={addTicketType}
              updateTicketType={updateTicketType}
              removeTicketType={removeTicketType}
            />

            <EmailConfig
              emailSubject={d.emailSubject || ''}
              emailBody={d.emailBody || ''}
              onEventChange={ev}
            />

            <SummaryConfig
              partyName={d.partyName || ''}
              date={d.date || ''}
              location={d.location || ''}
              primaryColor={t.primaryColor || '#00ffcc'}
              ticketTypes={ticketTypes}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
