export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  createdAt: string;
}

export interface SalesByDay {
  date: string;
  count: number;
  revenue: number;
}

export interface SalesByHour {
  hour: string;
  count: number;
}

export interface TicketTypeSales {
  id: string;
  name: string;
  sold: number;
  revenue: number;
  maxStock: number;
}

export interface AnalyticsData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  ticketsSold: number;
  validatedCount: number;
  totalCapacity: number;
  expenses: Expense[];
  salesByDay: SalesByDay[];
  salesByHour: SalesByHour[];
  salesByTicketType: TicketTypeSales[];
}

export const EXPENSE_CATEGORIES = [
  { value: 'GENERAL', label: 'General / Otros', bg: 'bg-[#2a2a2a]', text: 'text-[#f0ede8]', border: 'border-neutral-700' },
  { value: 'BAR', label: 'Bar y Consumibles', bg: 'bg-[#f0ede8]', text: 'text-[#0a0a0a]', border: 'border-neutral-300' },
  { value: 'VENUE', label: 'Alquiler Recinto & Sonido', bg: 'bg-[#e63329]', text: 'text-white', border: 'border-red-700' },
  { value: 'DJ', label: 'Caché DJs / Artistas', bg: 'bg-[#0a0a0a]', text: 'text-[#f0ede8]', border: 'border-white border' },
  { value: 'MARKETING', label: 'Marketing / RRPP', bg: 'bg-[#3a3530]', text: 'text-[#f0ede8]', border: 'border-stone-700' },
  { value: 'STAFF', label: 'Seguridad / Personal', bg: 'bg-[#f0ede8]', text: 'text-[#0a0a0a]', border: 'border-black border-2' },
];

export type TabType = 'resumen' | 'gastos' | 'ventas' | 'analisis';
