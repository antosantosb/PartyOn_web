import { DollarSign, Download } from 'lucide-react';
import type { AnalyticsData } from './types';
import { EXPENSE_CATEGORIES } from './types';

interface TabAnalisisProps {
  analytics: AnalyticsData;
  formatCurrency: (val: number) => string;
  onExportCSV: () => void;
  onExportMarketingCSV: () => void;
  selectedEventId: string;
  primaryColor: string;
}

export default function TabAnalisis({ analytics, formatCurrency, onExportCSV, onExportMarketingCSV, selectedEventId, primaryColor }: TabAnalisisProps) {
  // Grouped expenses for Category Donut
  const groupedExpenses = analytics.expenses.reduce((acc: { [key: string]: number }, exp) => {
    const cat = exp.category || 'GENERAL';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += exp.amount;
    return acc;
  }, {});

  // Render Hour Chart
  const renderHourChart = () => {
    if (!analytics.salesByHour || analytics.salesByHour.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-[#7a7269] italic text-sm border-2 border-black bg-[#111111] rounded-none">
          Sin registros de hora.
        </div>
      );
    }
    const maxVal = Math.max(...analytics.salesByHour.map(h => h.count), 1);
    const width = 500;
    const height = 180;
    const padding = 30;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    const barWidth = chartWidth / analytics.salesByHour.length - 4;

    return (
      <div className="relative border-4 border-black p-4 bg-[#111111] rounded-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Horizontal grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#2a2a2a" strokeWidth="2" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#2a2a2a" strokeWidth="2" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#000000" strokeWidth="3" />

          {/* Y Axis line */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#000000" strokeWidth="3" />

          {/* Y-axis Labels */}
          <text x={padding - 8} y={padding + 3} fill="#7a7269" fontSize="8" fontFamily="monospace" textAnchor="end">{maxVal}</text>
          <text x={padding - 8} y={height / 2 + 3} fill="#7a7269" fontSize="8" fontFamily="monospace" textAnchor="end">{Math.round(maxVal / 2)}</text>
          <text x={padding - 8} y={height - padding + 3} fill="#7a7269" fontSize="8" fontFamily="monospace" textAnchor="end">0</text>

          {analytics.salesByHour.map((h, i) => {
            const barHeight = (h.count / maxVal) * chartHeight;
            const x = padding + i * (chartWidth / analytics.salesByHour.length) + 2;
            const y = height - padding - barHeight;
            const showLabel = i % 3 === 0;

            return (
              <g key={h.hour}>
                <rect 
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={primaryColor}
                  stroke="#000"
                  strokeWidth="2"
                />
                {showLabel && (
                  <>
                    <line 
                      x1={x + barWidth / 2} 
                      y1={height - padding} 
                      x2={x + barWidth / 2} 
                      y2={height - padding + 5} 
                      stroke="#2a2a2a" 
                      strokeWidth="2" 
                    />
                    <text 
                      x={x + barWidth / 2} 
                      y={height - padding + 15} 
                      fill="#7a7269" 
                      fontSize="8" 
                      fontFamily="monospace" 
                      textAnchor="middle"
                    >
                      {h.hour}
                    </text>
                  </>
                )}
                {h.count > 0 && (
                  <text 
                    x={x + barWidth / 2} 
                    y={y - 4} 
                    fill="#fff" 
                    fontSize="7" 
                    fontFamily="monospace" 
                    textAnchor="middle"
                  >
                    {h.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="text-center text-[10px] font-mono text-white mt-1 uppercase font-bold">
          Distribución de Ventas por Hora
        </div>
      </div>
    );
  };

  // Render donut chart
  const renderDonut = (slices: { label: string; value: number; color: string }[], centerLabel: string) => {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-[#7a7269] italic text-sm border-2 border-black bg-[#111111] rounded-none">
          Sin datos para mostrar.
        </div>
      );
    }

    let accumulatedAngle = 0;
    const radius = 50;
    const strokeWidth = 20;
    const circ = 2 * Math.PI * radius;

    return (
      <div className="flex flex-col items-center border-4 border-black p-4 bg-[#111111] rounded-none">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
            {slices.map((slice, i) => {
              if (slice.value === 0) return null;
              const percentage = slice.value / total;
              const strokeLength = percentage * circ;
              const strokeOffset = circ - (accumulatedAngle * circ) + (percentage * circ);
              accumulatedAngle += percentage;

              return (
                <circle
                  key={i}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${strokeLength} ${circ}`}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-mono text-[#7a7269] uppercase font-bold">Total</span>
            <span className="text-lg font-display font-bold text-white tracking-tighter">{centerLabel}</span>
          </div>
        </div>
        <div className="w-full mt-4 space-y-1">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border border-black inline-block" style={{ backgroundColor: slice.color }} />
                <span className="text-[#f0ede8] truncate max-w-[140px]">{slice.label}</span>
              </div>
              <span className="font-bold text-white">{formatCurrency(slice.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const netBalance = Math.max(0, analytics.totalRevenue - analytics.totalExpenses);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b-4 border-black pb-4 flex-wrap gap-4">
        <h2 className="text-2xl font-display font-black text-white uppercase flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-[#7a7269]" /> Análisis y Desgloses Financieros
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* Donut 1: Revenue vs Expenses */}
        <div className="space-y-4">
          <div className="bg-[#111111] border-4 border-black p-4">
            <h3 className="text-sm font-mono text-white uppercase font-bold tracking-widest">Ingresos vs Gastos</h3>
            <p className="text-xs text-[#7a7269] font-mono">Proporción general de caja.</p>
          </div>
          {renderDonut([
            { label: 'Ingresos', value: analytics.totalRevenue, color: '#f0ede8' },
            { label: 'Gastos', value: analytics.totalExpenses, color: primaryColor }
          ], formatCurrency(netBalance))}
        </div>

        {/* Donut 2: Expenses by Category */}
        <div className="space-y-4">
          <div className="bg-[#111111] border-4 border-black p-4">
            <h3 className="text-sm font-mono text-white uppercase font-bold tracking-widest">Gastos por Categoría</h3>
            <p className="text-xs text-[#7a7269] font-mono">Distribución operativa de egresos.</p>
          </div>
          {renderDonut(
            EXPENSE_CATEGORIES.map((cat, i) => {
              const totalCat = groupedExpenses[cat.value] || 0;
              const colors = ['#f0ede8', primaryColor, '#2a2a2a', '#444444', '#7a7269', '#a09d97'];
              return {
                label: cat.label,
                value: totalCat,
                color: colors[i % colors.length]
              };
            }).filter(c => c.value > 0),
            formatCurrency(analytics.totalExpenses)
          )}
        </div>

        {/* Ticket medio & Stats */}
        <div className="space-y-4 flex flex-col justify-between h-full">
          <div className="bg-[#111111] border-4 border-black p-4">
            <h3 className="text-sm font-mono text-white uppercase font-bold tracking-widest">Ticket Medio</h3>
            <p className="text-xs text-[#7a7269] font-mono">Eficiencia del promedio por ticket.</p>
          </div>
          <div className="bg-[#111111] border-4 border-black p-8 text-center flex-1 flex flex-col justify-center">
            <span className="text-[10px] font-mono text-[#7a7269] uppercase font-bold tracking-widest block mb-2">
              Ticket Medio de Venta
            </span>
            <span className="text-5xl font-display font-black text-white">
              {formatCurrency(analytics.ticketsSold > 0 ? analytics.totalRevenue / analytics.ticketsSold : 0)}
            </span>
            <span className="text-[9px] font-mono text-[#7a7269] uppercase block mt-3">
              Total Recaudado / Entradas Emitidas
            </span>
          </div>
        </div>

      </div>

      {/* Hourly Chart (Full Width) */}
      <div className="space-y-4">
        <div className="bg-[#111111] border-4 border-black p-4">
          <h3 className="text-sm font-mono text-white uppercase font-bold tracking-widest">Distribución Temporal</h3>
          <p className="text-xs text-[#7a7269] font-mono">Ventas agrupadas por hora de compra.</p>
        </div>
        {renderHourChart()}
      </div>
    </div>
  );
}
