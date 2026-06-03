import React from 'react';

interface LogoConfigProps {
  logoText1: string;
  isUploading: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, field: 'logoText1') => Promise<void>;
  onChange: (value: string) => void;
}

export function LogoConfig({ logoText1, isUploading, handleImageUpload, onChange }: LogoConfigProps) {
  return (
    <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
      <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6">Logo del Evento</p>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <img
            src={(logoText1 && (logoText1.startsWith('http') || logoText1.startsWith('/'))) ? logoText1 : '/logo.PNG'}
            alt="Logo del evento"
            className="h-16 w-auto object-contain bg-black/40 p-2 border border-white/10"
            onError={(e) => { e.currentTarget.src = '/logo.PNG'; }}
          />
          <div className="flex-1">
            <span className="block text-xs text-white/40 mb-1">Imagen del Logo</span>
            <span className="block text-[10px] text-white/20">Por defecto: logo.PNG (fondo transparente)</span>
          </div>
        </div>
        <div>
          <label className="w-full inline-flex justify-center items-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 px-4 py-2.5 rounded-lg text-xs font-semibold font-mono tracking-wider text-white uppercase cursor-pointer hover:bg-white/8 active:scale-98 transition-all">
            {isUploading ? 'Subiendo...' : 'SUBIR LOGO PERSONALIZADO'}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={e => handleImageUpload(e, 'logoText1')}
              disabled={isUploading}
            />
          </label>
          {logoText1 && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="mt-2 text-[10px] text-red-400 hover:text-red-300 font-mono w-full text-center tracking-widest uppercase"
            >
              [ Usar logo predeterminado ]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
