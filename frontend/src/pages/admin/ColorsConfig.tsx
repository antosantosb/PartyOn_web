import React from 'react';

interface ColorsConfigProps {
  primaryColor: string;
  onThemeChange: (key: string, value: string) => void;
}

export function ColorsConfig({ primaryColor, onThemeChange }: ColorsConfigProps) {
  const inputClass = "w-full bg-[#1a1a1a] border border-white/8 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-white/25 transition-colors placeholder-white/20";
  const labelClass = "block text-xs font-mono text-white/40 uppercase tracking-wider mb-2";

  return (
    <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-5">
      <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6">Colores</p>
      <div>
        <label className={labelClass}>Color de Acento</label>
        <div className="flex gap-3 items-center">
          <input type="color" value={primaryColor || '#ffffff'} onChange={e => onThemeChange('primaryColor', e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent" />
          <input type="text" value={primaryColor || ''} onChange={e => onThemeChange('primaryColor', e.target.value)} className={`${inputClass} font-mono uppercase flex-1`} />
        </div>
        <p className="text-xs text-white/20 mt-1">Stripe lateral, botones, tags del lineup</p>
      </div>
      <div className="flex gap-2 pt-1">
        <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: primaryColor }} />
      </div>
    </div>
  );
}
