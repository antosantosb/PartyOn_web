import React from 'react';
import { ImageIcon, Loader2, CheckCircle2, Plus, Trash2 } from 'lucide-react';

interface BackgroundImagesConfigProps {
  backgroundImage: string;
  backgroundImageMobile: string;
  partyName: string;
  primaryColor: string;
  isUploading: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, field: 'backgroundImage' | 'backgroundImageMobile') => Promise<void>;
  onThemeChange: (key: string, value: string) => void;
}

export function BackgroundImagesConfig({
  backgroundImage,
  backgroundImageMobile,
  partyName,
  primaryColor,
  isUploading,
  handleImageUpload,
  onThemeChange,
}: BackgroundImagesConfigProps) {
  const labelClass = "block text-xs font-mono text-white/40 uppercase tracking-wider mb-2";

  return (
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
              : backgroundImage
                ? <><CheckCircle2 className="w-5 h-5 text-green-500" /><span className="text-xs text-white/50">Cambiar imagen</span></>
                : <><Plus className="w-5 h-5 text-white/20" /><span className="text-xs text-white/40">Subir imagen</span></>
            }
            <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'backgroundImage')} disabled={isUploading} />
          </label>
          {backgroundImage && (
            <div className="mt-2 relative group">
              <img src={backgroundImage} className="w-full h-20 object-cover rounded-lg border border-white/10" alt="Preview" />
              <button onClick={() => onThemeChange('backgroundImage', '')} className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
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
              : backgroundImageMobile
                ? <><CheckCircle2 className="w-5 h-5 text-green-500" /><span className="text-xs text-white/50">Cambiar imagen</span></>
                : <><Plus className="w-5 h-5 text-white/20" /><span className="text-xs text-white/40">Subir imagen</span></>
            }
            <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'backgroundImageMobile')} disabled={isUploading} />
          </label>
          {backgroundImageMobile && (
            <div className="mt-2 relative group">
              <img src={backgroundImageMobile} className="w-full h-20 object-cover rounded-lg border border-white/10" alt="Preview Mobile" />
              <button onClick={() => onThemeChange('backgroundImageMobile', '')} className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-lg overflow-hidden h-32 relative mt-4">
        <div className="absolute inset-0" style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.45)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(12,12,12,0.95) 100%)' }} />
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: primaryColor }} />
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <p className="text-[9px] font-mono uppercase tracking-[0.25em] mb-0.5" style={{ color: primaryColor }}>Preview</p>
          <p className="text-white font-bold text-sm leading-tight">{partyName || 'Nombre del Evento'}</p>
        </div>
      </div>
    </div>
  );
}
