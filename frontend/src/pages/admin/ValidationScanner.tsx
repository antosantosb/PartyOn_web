import { useEffect, useState, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { CheckCircle, XCircle, Search, Ticket, LogOut, X, Banknote, Smartphone } from 'lucide-react';
import { useStore } from '../../lib/store';
import { apiFetch } from '../../lib/api-client';

type ValidationState = 'idle' | 'success' | 'error' | 'loading';
type WalkInState = 'idle' | 'loading' | 'success' | 'error';

export default function ValidationScanner() {
  const { eventData } = useStore();
  const [state, setState] = useState<ValidationState>('idle');
  const [message, setMessage] = useState('');
  const [ticketData, setTicketData] = useState<{ name: string; ticketTypeName: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const lastScannedRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  // Walk-in sale states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('Taquilla');
  const [buyerEmail, setBuyerEmail] = useState('taquilla@partyon.pt');
  
  // Find door ticket default price
  const doorTicket = eventData?.ticketTypes?.find(t => t.isDoorType);
  const defaultPrice = doorTicket ? doorTicket.price : 10;
  
  const [pricePaid, setPricePaid] = useState(String(defaultPrice));
  const [selectedPayment, setSelectedPayment] = useState<'EFECTIVO' | 'MBWAY' | null>(null);
  const [walkinState, setWalkinState] = useState<WalkInState>('idle');
  const [walkinError, setWalkinError] = useState('');

  // Update default price when eventData resolves
  useEffect(() => {
    if (doorTicket) {
      setPricePaid(String(doorTicket.price));
    }
  }, [eventData]);

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

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  };

  const handleWalkInSubmit = async () => {
    if (!eventData?.id || !selectedPayment || !buyerName.trim() || !buyerEmail.trim()) {
      setWalkinError('Rellene todos los campos obligatorios');
      return;
    }

    setWalkinState('loading');
    setWalkinError('');

    try {
      const res = await apiFetch('/admin/tickets/walk-in', {
        method: 'POST',
        body: JSON.stringify({
          eventId: eventData.id,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          pricePaid: parseFloat(pricePaid) || 0,
          paymentMethod: selectedPayment
        })
      });

      const data = await res.json();

      if (res.ok) {
        setWalkinState('success');
        
        // Show validation scanner success overlay for feedback
        setState('success');
        setMessage('VENTA COMPLETADA');
        setTicketData({
          name: buyerName.trim(),
          ticketTypeName: `Taquilla (${selectedPayment})`
        });

        setTimeout(() => {
          setIsModalOpen(false);
          setWalkinState('idle');
          setState('idle');
          setMessage('');
          setTicketData(null);
        }, 2000);
      } else {
        setWalkinState('error');
        setWalkinError(data.error || 'Error al procesar la venta en puerta');
      }
    } catch (err) {
      setWalkinState('error');
      setWalkinError('Error de red al conectar con el servidor');
    }
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-white/50 uppercase">Online</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 border border-white/10 hover:border-red-500/30 hover:text-red-400 transition-colors cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* ── CAMERA VIEW (Top Half) ── */}
      <div className="w-full bg-black relative flex-1 min-h-[45vh] overflow-hidden flex items-center justify-center">
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
      <div className="p-6 bg-[#0c0c0c] border-t border-white/10 shrink-0 pb-24 md:pb-6">
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
            className="bg-white/10 hover:bg-white/20 disabled:opacity-50 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center cursor-pointer"
          >
            Buscar
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-white/20 text-xs text-center">
          <Ticket className="w-4 h-4" />
          <span>Apunte la cámara al código QR de la entrada</span>
        </div>
      </div>

      {/* ── FAB FOR WALK-IN (Venta en Puerta) ── */}
      <button
        onClick={() => {
          setBuyerName('Taquilla');
          setBuyerEmail('taquilla@partyon.pt');
          setPricePaid(String(defaultPrice));
          setSelectedPayment(null);
          setWalkinState('idle');
          setWalkinError('');
          setIsModalOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 bg-accent text-white font-mono font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-none border-2 border-white shadow-[4px_4px_0_0_rgba(255,255,255,0.15)] flex items-center gap-2 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(255,255,255,0.25)] active:translate-x-[0px] active:translate-y-[0px] transition-all cursor-pointer select-none"
      >
        <Ticket size={16} /> VENTA PUERTA
      </button>

      {/* ── WALK-IN MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">Venta en Puerta</h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-10 h-10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-colors bg-transparent rounded-none cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto py-6 space-y-6">
            {walkinState === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-none text-center font-mono">
                {walkinError}
              </div>
            )}

            {walkinState === 'success' && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-4 rounded-none text-center font-mono animate-pulse">
                ¡Venta registrada con éxito!
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Nombre del Cliente</label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full bg-[#121212] border-2 border-white/10 focus:border-accent p-4 text-white text-sm focus:outline-none transition-colors rounded-none"
                placeholder="Nombre"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Email de Contacto</label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="w-full bg-[#121212] border-2 border-white/10 focus:border-accent p-4 text-white text-sm focus:outline-none transition-colors rounded-none"
                placeholder="Email"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Precio Cobrado (€)</label>
              <input
                type="number"
                step="0.01"
                value={pricePaid}
                onChange={(e) => setPricePaid(e.target.value)}
                className="w-full bg-[#121212] border-2 border-white/10 focus:border-accent p-4 text-white text-sm focus:outline-none transition-colors rounded-none font-mono text-lg font-bold"
                placeholder="0.00"
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-3">Método de Pago</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedPayment('EFECTIVO')}
                  className={`py-8 flex flex-col items-center justify-center gap-3 border-2 transition-all cursor-pointer rounded-none font-mono font-bold text-xs uppercase tracking-wider select-none ${
                    selectedPayment === 'EFECTIVO'
                      ? 'border-accent bg-accent/10 text-white shadow-[4px_4px_0_0_var(--accent)] translate-x-[-2px] translate-y-[-2px]'
                      : 'border-white/10 bg-[#121212] text-white/60 hover:border-white/20'
                  }`}
                >
                  <Banknote size={24} className={selectedPayment === 'EFECTIVO' ? 'text-accent' : 'text-white/40'} />
                  EFECTIVO
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPayment('MBWAY')}
                  className={`py-8 flex flex-col items-center justify-center gap-3 border-2 transition-all cursor-pointer rounded-none font-mono font-bold text-xs uppercase tracking-wider select-none ${
                    selectedPayment === 'MBWAY'
                      ? 'border-accent bg-accent/10 text-white shadow-[4px_4px_0_0_var(--accent)] translate-x-[-2px] translate-y-[-2px]'
                      : 'border-white/10 bg-[#121212] text-white/60 hover:border-white/20'
                  }`}
                >
                  <Smartphone size={24} className={selectedPayment === 'MBWAY' ? 'text-accent' : 'text-white/40'} />
                  MBWAY
                </button>
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-6 border-t border-white/10">
            <button
              onClick={handleWalkInSubmit}
              disabled={walkinState === 'loading' || !selectedPayment || !buyerName.trim() || !buyerEmail.trim()}
              className="brut-btn w-full flex items-center justify-center gap-2 py-4 cursor-pointer"
            >
              {walkinState === 'loading' ? (
                'REGISTRANDO...'
              ) : (
                <>
                  CONFIRMAR COBRO ({parseFloat(pricePaid || '0').toFixed(2)}€)
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}
