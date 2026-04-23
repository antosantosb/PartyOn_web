import { useEffect, useState, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { CheckCircle, XCircle, Search, Ticket } from 'lucide-react';

import { apiFetch } from '../../lib/api-client';

type ValidationState = 'idle' | 'success' | 'error' | 'loading';

export default function ValidationScanner() {
  const [state, setState] = useState<ValidationState>('idle');
  const [message, setMessage] = useState('');
  const [ticketData, setTicketData] = useState<{ name: string; ticketTypeName: string } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const lastScannedRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const codeReader = new BrowserQRCodeReader();
    let controls: any = null;

    const startScanner = async () => {
      try {
        controls = await codeReader.decodeFromVideoDevice(
          undefined, 
          'video-element', 
          (result, error, ctrls) => {
            if (result) {
              const decodedText = result.getText();
              
              if (isProcessingRef.current) return;
              if (lastScannedRef.current === decodedText) return;
              
              isProcessingRef.current = true;
              lastScannedRef.current = decodedText;
              
              handleValidation(decodedText);
            }
          }
        );
      } catch (err) {
        console.error("Scanner Error:", err);
      }
    };

    startScanner();

    return () => {
      if (controls) {
        controls.stop();
      }
    };
  }, []);

  const handleValidation = async (ticketId: string) => {
    setState('loading');
    setTicketData(null);
    setMessage('Validando...');

    try {
      const res = await apiFetch('/admin/tickets/validate', {
        method: 'POST',
        body: JSON.stringify({ ticketId })
      });

      const data = await res.json();

      if (res.ok) {
        setState('success');
        setMessage(data.message || 'APPROVED');
        setTicketData(data.ticket);
      } else {
        setState('error');
        setMessage(data.error || 'INVALID / USED');
      }
    } catch (err) {
      setState('error');
      setMessage('Error de conexión');
    }

    // Reset after 3 seconds so staff don't touch their phones between guests
    setTimeout(() => {
      setState('idle');
      setMessage('');
      setTicketData(null);
      lastScannedRef.current = null;
      isProcessingRef.current = false;
    }, 3000);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    isProcessingRef.current = true;
    handleValidation(searchQuery.trim());
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden">
      
      {/* ── OVERLAYS ── */}
      {state === 'success' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-green-500 text-white animate-in fade-in duration-200">
          <CheckCircle className="w-32 h-32 mb-6" />
          <h1 className="text-5xl font-black uppercase tracking-widest text-center mb-4">APPROVED</h1>
          {ticketData && (
            <div className="text-center mt-4 bg-black/20 p-6 rounded-2xl backdrop-blur-sm">
              <p className="text-3xl font-bold mb-2">{ticketData.name}</p>
              <p className="text-xl opacity-90">{ticketData.ticketTypeName}</p>
            </div>
          )}
        </div>
      )}

      {state === 'error' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-600 text-white animate-in fade-in duration-200">
          <XCircle className="w-32 h-32 mb-6" />
          <h1 className="text-5xl font-black uppercase tracking-widest text-center px-4">{message}</h1>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="p-4 border-b border-white/10 bg-[#0c0c0c] flex items-center justify-between shrink-0">
        <h2 className="font-bold tracking-widest uppercase text-white/80">Scanner</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-white/50 uppercase">Online</span>
        </div>
      </div>

      {/* ── CAMERA VIEW (Top Half) ── */}
      <div className="w-full bg-black relative flex-1 min-h-[50vh] overflow-hidden flex items-center justify-center">
        {/* We use a direct video element for ZXing to attach to */}
        <video id="video-element" className="absolute top-0 left-0 w-full h-full object-cover" />
        
        {/* Scanner target box overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative">
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-3xl"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-3xl"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-3xl"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-3xl"></div>
          </div>
        </div>
      </div>

      {/* ── MANUAL SEARCH (Bottom Half) ── */}
      <div className="p-6 bg-[#0c0c0c] border-t border-white/10 shrink-0">
        <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Fallback CRM</p>
        
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID de entrada..."
              className="w-full bg-[#161616] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <button 
            type="submit"
            disabled={state === 'loading'}
            className="bg-white/10 hover:bg-white/20 disabled:opacity-50 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center"
          >
            Buscar
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-white/20 text-xs text-center">
          <Ticket className="w-4 h-4" />
          <span>Apunte la cámara al código QR de la entrada</span>
        </div>
      </div>
      
    </div>
  );
}
