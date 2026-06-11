import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ChevronRight } from 'lucide-react';
import type { AnalyticsData, TabType } from './types';

interface TabResumenProps {
  analytics: AnalyticsData;
  formatCurrency: (val: number) => string;
  setActiveTab: (tab: TabType) => void;
  primaryColor: string;
}

export default function TabResumen({ analytics, formatCurrency, setActiveTab, primaryColor }: TabResumenProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
      
      {/* Income Card */}
      <div 
        onClick={() => setActiveTab('ventas')}
        onMouseEnter={() => setHoveredCard(0)}
        onMouseLeave={() => setHoveredCard(null)}
        style={hoveredCard === 0 ? { borderColor: primaryColor } : {}}
        className="bg-[#111111] border-4 border-black rounded-none p-6 relative cursor-pointer transition-all group"
      >
        <div className="flex justify-between items-start mb-6">
          <span className="text-[10px] font-mono bg-white text-black px-2 py-0.5 font-bold uppercase tracking-widest border border-black">
            INGRESO ↑
          </span>
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-xs text-[#7a7269] font-mono uppercase tracking-widest mb-1">Ingresos Totales</h3>
        <p className="text-4xl font-display font-black text-white tracking-tighter uppercase">{formatCurrency(analytics.totalRevenue)}</p>
        <div className="mt-6 pt-4 border-t-2 border-[#2a2a2a] flex items-center justify-between text-[10px] font-mono text-[#7a7269] uppercase">
          <span>Ventas acumuladas</span>
          <ChevronRight className="w-4 h-4 text-[#7a7269] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Expenses Card */}
      <div 
        onClick={() => setActiveTab('gastos')}
        onMouseEnter={() => setHoveredCard(1)}
        onMouseLeave={() => setHoveredCard(null)}
        style={hoveredCard === 1 ? { borderColor: primaryColor } : {}}
        className="bg-[#111111] border-4 border-black rounded-none p-6 relative cursor-pointer transition-all group"
      >
        <div className="flex justify-between items-start mb-6">
          <span className="text-[10px] font-mono bg-[#0a0a0a] text-white border border-white/20 px-2 py-0.5 font-bold uppercase tracking-widest">
            GASTO ↓
          </span>
          <TrendingDown className="w-5 h-5" style={{ color: primaryColor }} />
        </div>
        <h3 className="text-xs text-[#7a7269] font-mono uppercase tracking-widest mb-1">Gastos Totales</h3>
        <p className="text-4xl font-display font-black tracking-tighter uppercase" style={{ color: primaryColor }}>{formatCurrency(analytics.totalExpenses)}</p>
        <div className="mt-6 pt-4 border-t-2 border-[#2a2a2a] flex items-center justify-between text-[10px] font-mono text-[#7a7269] uppercase">
          <span>{analytics.expenses.length} gastos operativos</span>
          <ChevronRight className="w-4 h-4 text-[#7a7269] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Balance Card */}
      <div 
        onClick={() => setActiveTab('analisis')}
        onMouseEnter={() => setHoveredCard(2)}
        onMouseLeave={() => setHoveredCard(null)}
        style={hoveredCard === 2 ? { borderColor: primaryColor } : {}}
        className="bg-[#111111] border-4 border-black rounded-none p-6 relative cursor-pointer transition-all group"
      >
        <div className="flex justify-between items-start mb-6">
          <span className="text-[10px] font-mono text-white px-2 py-0.5 font-bold uppercase tracking-widest border border-black" style={{ backgroundColor: primaryColor }}>
            BALANCE
          </span>
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-xs text-[#7a7269] font-mono uppercase tracking-widest mb-1">Beneficio Neto</h3>
        <p className="text-4xl font-display font-black text-white tracking-tighter uppercase">
          {formatCurrency(Math.round((analytics.totalRevenue - analytics.totalExpenses) * 100) / 100)}
        </p>
        <div className="mt-6 pt-4 border-t-2 border-[#2a2a2a] flex items-center justify-between text-[10px] font-mono text-[#7a7269] uppercase">
          <span>Balance de caja</span>
          <ChevronRight className="w-4 h-4 text-[#7a7269] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

    </div>
  );
}
