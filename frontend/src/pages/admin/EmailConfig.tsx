import React from 'react';
import { Mail } from 'lucide-react';

interface EmailConfigProps {
  emailSubject: string;
  emailBody: string;
  onEventChange: (key: string, value: string) => void;
}

export function EmailConfig({ emailSubject, emailBody, onEventChange }: EmailConfigProps) {
  const inputClass = "w-full bg-[#1a1a1a] border border-white/8 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-white/25 transition-colors placeholder-white/20";
  const labelClass = "block text-xs font-mono text-white/40 uppercase tracking-wider mb-2";

  return (
    <div className="bg-[#161616] border border-white/8 rounded-xl p-6 space-y-4">
      <p className="text-sm font-semibold text-white/60 pb-2 border-b border-white/6 flex items-center justify-between">
        Personalización de Email <Mail className="w-4 h-4 text-white/20" />
      </p>
      <div>
        <label className={labelClass}>Asunto del Correo</label>
        <input
          type="text"
          value={emailSubject || ''}
          onChange={e => onEventChange('emailSubject', e.target.value)}
          className={inputClass}
          placeholder="Tu entrada para..."
        />
      </div>
      <div>
        <label className={labelClass}>Mensaje del Correo <span className="normal-case text-white/20">(Markdown compatible)</span></label>
        <textarea
          rows={4}
          value={emailBody || ''}
          onChange={e => onEventChange('emailBody', e.target.value)}
          className={`${inputClass} resize-none`}
          placeholder="Gracias por tu compra..."
        />
        <p className="text-[10px] text-white/20 mt-2">Este mensaje aparecerá arriba de los adjuntos PDF.</p>
      </div>
    </div>
  );
}
