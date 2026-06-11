import { TrendingUp, Download, Users } from 'lucide-react';
import type { AnalyticsData } from './types';

interface TabVentasProps {
  analytics: AnalyticsData;
  formatCurrency: (val: number) => string;
  onExportCSV: () => void;
  onExportMarketingCSV: () => void;
  selectedEventId: string;
  primaryColor: string;
}

export default function TabVentas({ analytics, formatCurrency, onExportCSV, onExportMarketingCSV, selectedEventId, primaryColor }: TabVentasProps) {
  // Render sales curve
  const renderLineChart = () => {
    if (!analytics.salesByDay || analytics.salesByDay.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-[#7a7269] italic text-sm border-2 border-black bg-[#111111] rounded-none">
          No hay suficientes ventas registradas para generar el gráfico.
        </div>
      );
    }

    let runningTotal = 0;
    const points = analytics.salesByDay.map((d) => {
      runningTotal += d.count;
      return { date: d.date, value: runningTotal };
    });

    const maxValue = Math.max(...points.map(p => p.value), 5);
    const width = 500;
    const height = 180;
    const padding = 30;

    const xCoords = points.map((_, i) => 
      padding + (i / (points.length - 1 || 1)) * (width - 2 * padding)
    );
    const yCoords = points.map(p => 
      height - padding - (p.value / maxValue) * (height - 2 * padding)
    );

    let pathD = "";
    if (points.length > 0) {
      pathD = `M ${xCoords[0]} ${yCoords[0]}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${xCoords[i]} ${yCoords[i]}`;
      }
    }

    return (
      <div className="relative border-4 border-black p-4 bg-[#111111] rounded-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Grid lines horizontal */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#2a2a2a" strokeWidth="2" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#2a2a2a" strokeWidth="2" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#000000" strokeWidth="3" />

          {/* Y Axis line */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#000000" strokeWidth="3" />

          {/* Y-axis Labels */}
          <text x={padding - 8} y={padding + 3} fill="#7a7269" fontSize="8" fontFamily="monospace" textAnchor="end">{maxValue}</text>
          <text x={padding - 8} y={height / 2 + 3} fill="#7a7269" fontSize="8" fontFamily="monospace" textAnchor="end">{Math.round(maxValue / 2)}</text>
          <text x={padding - 8} y={height - padding + 3} fill="#7a7269" fontSize="8" fontFamily="monospace" textAnchor="end">0</text>

          {/* Line path */}
          {pathD && (
            <path 
              d={pathD} 
              fill="none" 
              stroke={primaryColor} 
              strokeWidth="4" 
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          )}

          {/* X-axis Ticks and Labels */}
          {points.map((p, i) => {
            const showLabel = 
              i === 0 || 
              i === points.length - 1 || 
              (points.length > 2 && i === Math.floor(points.length / 2)) ||
              (points.length > 5 && (i === Math.floor(points.length / 4) || i === Math.floor(3 * points.length / 4)));

            if (!showLabel) return null;

            return (
              <g key={`x-tick-${i}`}>
                <line 
                  x1={xCoords[i]} 
                  y1={height - padding} 
                  x2={xCoords[i]} 
                  y2={height - padding + 5} 
                  stroke="#2a2a2a" 
                  strokeWidth="2" 
                />
                <text 
                  x={xCoords[i]} 
                  y={height - padding + 15} 
                  fill="#7a7269" 
                  fontSize="8" 
                  fontFamily="monospace" 
                  textAnchor="middle"
                >
                  {(() => {
                    const parts = p.date.split('-');
                    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : p.date;
                  })()}
                </text>
              </g>
            );
          })}

          {/* Points */}
          {points.map((p, i) => (
            <rect 
              key={i}
              x={xCoords[i] - 4} 
              y={yCoords[i] - 4} 
              width="8"
              height="8"
              fill="#ffffff" 
              stroke={primaryColor} 
              strokeWidth="2" 
            />
          ))}
        </svg>
        <div className="text-center text-[10px] font-mono text-white mt-2 uppercase font-bold">
          Curva de Ventas (Acumulada por Fechas)
        </div>
      </div>
    );
  };

  const validatedPct = analytics.ticketsSold ? Math.min(Math.round((analytics.validatedCount / analytics.ticketsSold) * 100), 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b-4 border-black pb-4 flex-wrap gap-4">
        <h2 className="text-2xl font-display font-black text-white uppercase flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-[#7a7269]" /> Rendimiento de Ventas
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <button 
            onClick={onExportCSV}
            disabled={!selectedEventId}
            style={{ backgroundColor: primaryColor }}
            className="brut-btn text-[10px] text-white"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button 
            onClick={onExportMarketingCSV}
            disabled={!selectedEventId}
            className="brut-btn text-[10px] text-white bg-black border-4 hover:brightness-110"
            style={{ borderColor: primaryColor }}
          >
            <Download className="w-4 h-4" /> Exportar Emails Publicidad (CSV)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Line Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#111111] border-4 border-black p-4">
            <h3 className="text-sm font-mono text-white uppercase font-bold tracking-widest">Evolución de Entradas</h3>
            <p className="text-xs text-[#7a7269] font-mono">Curva acumulada por fechas de venta.</p>
          </div>
          {renderLineChart()}
        </div>

        {/* Right Column: Ticket types list */}
        <div className="bg-[#111111] border-4 border-black p-6 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-sm font-mono text-white uppercase font-bold tracking-widest mb-1">Ventas por Tipo</h3>
            <p className="text-xs text-[#7a7269] font-mono">Consumo de stock y recaudación.</p>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-60 pr-2">
            {analytics.salesByTicketType && analytics.salesByTicketType.length > 0 ? (
              analytics.salesByTicketType.map(type => {
                const pct = type.maxStock ? Math.min(Math.round((type.sold / type.maxStock) * 100), 100) : 0;
                return (
                  <div key={type.id} className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-bold text-white uppercase">{type.name}</span>
                      <span className="text-[#7a7269]">{type.sold} vendidos ({formatCurrency(type.revenue)})</span>
                    </div>
                    <div className="h-4 bg-[#0a0a0a] border-2 border-black rounded-none overflow-hidden relative">
                      <div 
                        className="h-full transition-all duration-500" 
                        style={{ width: `${type.maxStock ? pct : (type.sold ? 100 : 0)}%`, backgroundColor: primaryColor }} 
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-[#7a7269] uppercase">
                      <span>Stock: {type.maxStock || 'Ilimitado'}</span>
                      <span>{type.maxStock ? `${pct}%` : 'N/A'}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-[#7a7269] italic text-xs py-8 text-center font-mono">No hay categorías de tickets registradas.</div>
            )}
          </div>
        </div>
      </div>

      {/* Asistencia Real (replaces capacity monitor) */}
      <div className="bg-[#111111] border-4 border-black p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-xl font-display font-black uppercase flex items-center gap-3">
              <Users className="w-5 h-5 text-[#7a7269]" /> Asistencia Real
            </h2>
            <p className="text-xs text-[#7a7269] font-mono mt-1">Personas que validaron su entrada (escaneadas o puerta).</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-4xl font-display font-black tracking-tighter text-white">
              {analytics.validatedCount} <span className="text-[#7a7269] text-2xl font-mono">/ {analytics.ticketsSold}</span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest mt-1" style={{ color: primaryColor }}>Entradas Validadas</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-8 bg-[#0a0a0a] p-1 border-4 border-black rounded-none">
            <div 
              className="h-full transition-all duration-1000"
              style={{ width: `${validatedPct}%`, backgroundColor: primaryColor }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-[#7a7269] uppercase tracking-widest">
            <span>Inicio 0%</span>
            <span className="text-white font-bold">{validatedPct}% Asistencia</span>
            <span>Total Vendido 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
