import React from 'react';

interface EventInfoConfigProps {
  partyName: string;
  status: string;
  tagline: string;
  date: string;
  location: string;
  eventCalendarDate: string;
  eventStartTime: string;
  eventEndTime: string;
  lineup: string;
  tickerText: string;
  primaryColor: string;
  errors: Record<string, string>;
  onEventChange: (key: string, value: string) => void;
  setEventCalendarDate: (val: string) => void;
  setEventStartTime: (val: string) => void;
  setEventEndTime: (val: string) => void;
}

export function EventInfoConfig({
  partyName,
  status,
  tagline,
  date,
  location,
  eventCalendarDate,
  eventStartTime,
  eventEndTime,
  lineup,
  tickerText,
  primaryColor,
  errors,
  onEventChange,
  setEventCalendarDate,
  setEventStartTime,
  setEventEndTime,
}: EventInfoConfigProps) {
  const inputClass = "w-full bg-[#1a1a1a] border border-white/8 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-white/25 transition-colors placeholder-white/20";
  const labelClass = "block text-xs font-mono text-white/40 uppercase tracking-wider mb-2";

  return (
    <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
      <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6">Info del Evento</p>
      <div>
        <label className={labelClass}>Nombre de la Fiesta</label>
        <input type="text" value={partyName || ''} onChange={e => onEventChange('partyName', e.target.value)} className={`${inputClass} ${errors.partyName ? 'border-red-500/50 bg-red-500/5' : ''}`} placeholder="EL PERREO INTENSO" />
        {errors.partyName && <p className="text-[10px] text-red-400 mt-1 font-mono uppercase tracking-wider">{errors.partyName}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Estado</label>
          <select
            value={status || 'DRAFT'}
            onChange={e => onEventChange('status', e.target.value)}
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
          <input type="text" value={tagline || ''} onChange={e => onEventChange('tagline', e.target.value)} className={inputClass} placeholder="La noche que no olvidarás" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Fecha <span className="normal-case text-white/20">(texto UI, ej: SÁB 15 NOV)</span></label>
          <input type="text" value={date || ''} onChange={e => onEventChange('date', e.target.value)} className={`${inputClass} ${errors.date ? 'border-red-500/50 bg-red-500/5' : ''}`} placeholder="SÁB 15 NOV" />
          {errors.date && <p className="text-[10px] text-red-400 mt-1 font-mono uppercase tracking-wider">{errors.date}</p>}
        </div>
        <div>
          <label className={labelClass}>Ubicación</label>
          <input type="text" value={location || ''} onChange={e => onEventChange('location', e.target.value)} className={`${inputClass} ${errors.location ? 'border-red-500/50 bg-red-500/5' : ''}`} placeholder="Braga, Portugal" />
          {errors.location && <p className="text-[10px] text-red-400 mt-1 font-mono uppercase tracking-wider">{errors.location}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className={labelClass}>Día del Evento</label>
          <input
            type="date"
            value={eventCalendarDate}
            onChange={e => setEventCalendarDate(e.target.value)}
            className={`${inputClass} ${errors.eventCalendarDate ? 'border-red-500/50 bg-red-500/5' : ''}`}
          />
          {errors.eventCalendarDate && <p className="text-[10px] text-red-400 mt-1 font-mono uppercase tracking-wider">{errors.eventCalendarDate}</p>}
        </div>
        <div className="col-span-1">
          <label className={labelClass}>Hora Inicio</label>
          <input
            type="text"
            placeholder="22:00"
            value={eventStartTime}
            onChange={e => setEventStartTime(e.target.value)}
            className={`${inputClass} ${errors.eventStartTime ? 'border-red-500/50 bg-red-500/5' : ''}`}
          />
          {errors.eventStartTime && <p className="text-[10px] text-red-400 mt-1 font-mono uppercase tracking-wider">{errors.eventStartTime}</p>}
        </div>
        <div className="col-span-1">
          <label className={labelClass}>Hora Fin</label>
          <input
            type="text"
            placeholder="06:00"
            value={eventEndTime}
            onChange={e => setEventEndTime(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Lineup <span className="normal-case text-white/20">(separado por comas)</span></label>
        <input type="text" value={lineup || ''} onChange={e => onEventChange('lineup', e.target.value)} className={inputClass} placeholder="DJ Álvaro, MC Regueton, La Reina Latina" />
        {lineup && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {lineup.split(',').filter(Boolean).map((a: string, i: number) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded border"
                style={{ borderColor: `${primaryColor}30`, color: primaryColor, backgroundColor: `${primaryColor}08` }}>
                {a.trim()}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={labelClass}>Texto Desplazable - Ticker <span className="normal-case text-white/20">(estilos de música separados por comas)</span></label>
        <input
          type="text"
          value={tickerText || ''}
          onChange={e => onEventChange('tickerText', e.target.value)}
          className={inputClass}
          placeholder="REGGAETON, SALSA, MERENGUE, BACHATA, DEMBOW"
        />
      </div>
    </div>
  );
}
