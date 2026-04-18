import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { Settings, Save, Image as ImageIcon, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Admin() {
  const store = useStore();
  
  // Initialize from store — but also update when the store loads from the backend
  const [eventData, setEventData] = useState(store.eventData);
  const [theme, setTheme] = useState(store.theme);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Sync local form state when the backend fetch completes 
  // (store.loading goes false = backend data has arrived)
  useEffect(() => {
    if (!store.loading) {
      setEventData(store.eventData);
      setTheme(store.theme);
    }
  }, [store.loading]);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await store.setEventData(eventData);
      await store.setTheme(theme);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('idle');
      alert('Error al guardar. Comprueba que el backend está activo.');
    }
  };

  const handleEventChange = (key: string, value: string) => {
    setEventData((prev: typeof eventData) => ({ ...prev, [key]: value }));
  };

  const handleThemeChange = (key: string, value: string) => {
    setTheme((prev: typeof theme) => ({ ...prev, [key]: value }));
  };

  const inputClass = "w-full bg-[#1a1a1a] border border-white/8 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-white/25 transition-colors placeholder-white/20";
  const labelClass = "block text-xs font-mono text-white/40 uppercase tracking-wider mb-2";

  return (
    <div
      className="min-h-screen bg-[#0c0c0c] text-white"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* Top bar */}
      <div className="border-b border-white/8 sticky top-0 z-10 bg-[#0c0c0c]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-white/30 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
              <ArrowLeft className="w-4 h-4" />
              Tienda
            </Link>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" style={{ color: theme.primaryColor }} />
              <span className="font-semibold text-sm">Backoffice</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              target="_blank"
              className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider hidden sm:block"
            >
              Ver Tienda ↗
            </Link>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-60 hover:brightness-110 active:scale-95"
              style={{ backgroundColor: theme.primaryColor, color: '#000' }}
            >
              {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
              {saveStatus === 'saved' && <CheckCircle2 className="w-4 h-4" />}
              {saveStatus === 'idle' && <Save className="w-4 h-4" />}
              {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {store.loading && (
          <div className="flex items-center gap-2 text-white/30 text-sm mb-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando datos del evento...
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ─── CONTENT SETTINGS ───────────────────────────────── */}
          <div className="space-y-6">
            <h2 className="text-xs font-mono text-white/30 uppercase tracking-[0.2em]">Contenido del Evento</h2>

            {/* Logo */}
            <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
              <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6">Logo de la Marca</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Texto Izquierda</label>
                  <input
                    type="text" value={eventData.logoText1 || ''}
                    onChange={e => handleEventChange('logoText1', e.target.value)}
                    className={inputClass}
                    placeholder="PARTY"
                  />
                </div>
                <div>
                  <label className={labelClass}>Texto Derecha <span className="normal-case text-white/20">(color acento)</span></label>
                  <input
                    type="text" value={eventData.logoText2 || ''}
                    onChange={e => handleEventChange('logoText2', e.target.value)}
                    className={inputClass}
                    placeholder="ON"
                  />
                </div>
              </div>
              {/* Live preview */}
              <div className="pt-2 text-lg font-bold">
                <span className="text-white">{eventData.logoText1 || 'PARTY'}</span>
                <span style={{ color: theme.primaryColor }}>{eventData.logoText2 || 'ON'}</span>
              </div>
            </div>

            {/* Event Info */}
            <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
              <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6">Info del Evento</p>
              <div>
                <label className={labelClass}>Nombre de la Fiesta</label>
                <input type="text" value={eventData.partyName || ''} onChange={e => handleEventChange('partyName', e.target.value)} className={inputClass} placeholder="EL PERREO INTENSO" />
              </div>
              <div>
                <label className={labelClass}>Tagline <span className="normal-case text-white/20">(subtítulo)</span></label>
                <input type="text" value={eventData.tagline || ''} onChange={e => handleEventChange('tagline', e.target.value)} className={inputClass} placeholder="La noche que no olvidarás" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input type="text" value={eventData.date || ''} onChange={e => handleEventChange('date', e.target.value)} className={inputClass} placeholder="SÁB 15 NOV" />
                </div>
                <div>
                  <label className={labelClass}>Ubicación</label>
                  <input type="text" value={eventData.location || ''} onChange={e => handleEventChange('location', e.target.value)} className={inputClass} placeholder="Club Nostalgia, Madrid" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Info / Descripción</label>
                <input type="text" value={eventData.artistInfo || ''} onChange={e => handleEventChange('artistInfo', e.target.value)} className={inputClass} placeholder="DJ Álvaro + invitados especiales" />
              </div>
              <div>
                <label className={labelClass}>Lineup <span className="normal-case text-white/20">(separado por comas)</span></label>
                <input type="text" value={eventData.lineup || ''} onChange={e => handleEventChange('lineup', e.target.value)} className={inputClass} placeholder="DJ Álvaro, MC Regueton, La Reina Latina" />
                {eventData.lineup && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {eventData.lineup.split(',').filter(Boolean).map((a: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: `${theme.primaryColor}30`, color: theme.primaryColor, backgroundColor: `${theme.primaryColor}08` }}>
                        {a.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── THEME SETTINGS ─────────────────────────────────── */}
          <div className="space-y-6">
            <h2 className="text-xs font-mono text-white/30 uppercase tracking-[0.2em]">Estética (Tema)</h2>

            {/* Colors */}
            <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-5">
              <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6">Colores</p>

              <div>
                <label className={labelClass}>Color de Acento</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color" value={theme.primaryColor}
                    onChange={e => handleThemeChange('primaryColor', e.target.value)}
                    className="w-12 h-10 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent"
                  />
                  <input
                    type="text" value={theme.primaryColor}
                    onChange={e => handleThemeChange('primaryColor', e.target.value)}
                    className={`${inputClass} font-mono uppercase flex-1`}
                  />
                </div>
                <p className="text-xs text-white/20 mt-1">Usado en: stripe lateral, tags, botón de compra, ticket</p>
              </div>

              <div>
                <label className={labelClass}>Color Secundario</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color" value={theme.secondaryColor}
                    onChange={e => handleThemeChange('secondaryColor', e.target.value)}
                    className="w-12 h-10 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent"
                  />
                  <input
                    type="text" value={theme.secondaryColor}
                    onChange={e => handleThemeChange('secondaryColor', e.target.value)}
                    className={`${inputClass} font-mono uppercase flex-1`}
                  />
                </div>
              </div>

              {/* Swatch preview row */}
              <div className="flex gap-2 pt-1">
                <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: theme.primaryColor }} />
                <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: theme.secondaryColor }} />
                <div className="flex-1 h-8 rounded-md bg-[#0c0c0c] border border-white/10 flex items-center justify-center">
                  <span className="text-[10px] font-mono text-white/40">BG</span>
                </div>
              </div>
            </div>

            {/* Background Image */}
            <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
              <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6 flex items-center justify-between">
                Imagen de Fondo
                <ImageIcon className="w-4 h-4 text-white/20" />
              </p>
              <div>
                <label className={labelClass}>URL de la imagen</label>
                <input
                  type="text" value={theme.backgroundImage || ''}
                  onChange={e => handleThemeChange('backgroundImage', e.target.value)}
                  className={inputClass}
                  placeholder="https://images.unsplash.com/photo-..."
                />
                <p className="text-xs text-white/20 mt-1.5">Usa Unsplash, tu CDN, o cualquier URL pública</p>
              </div>

              {/* Live preview — accurate to the customer UI */}
              <div className="rounded-lg overflow-hidden h-36 relative">
                <div
                  className="absolute inset-0"
                  style={{ backgroundImage: `url(${theme.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.45)' }}
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(12,12,12,0.95) 100%)' }} />
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: theme.primaryColor }} />
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  <p className="text-[9px] font-mono uppercase tracking-[0.25em] mb-1" style={{ color: theme.primaryColor }}>
                    Próximo Evento
                  </p>
                  <p className="text-white font-bold text-sm leading-tight">{eventData.partyName || 'Nombre del Evento'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
