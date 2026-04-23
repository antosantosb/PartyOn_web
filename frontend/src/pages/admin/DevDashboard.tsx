import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/api-client';
import { Search, Database, Server, Activity, Terminal, AlertCircle, AlertTriangle } from 'lucide-react';

interface Ticket {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  event: { name: string };
  ticketType: { name: string };
}

interface DBStats {
  counts: {
    events: number;
    tickets: number;
    expenses: number;
    users: number;
  };
  recentTickets: Ticket[];
}

interface AuditLog {
  id: string;
  severity: string;
  action: string;
  details: string | null;
  timestamp: string;
}

export default function DevDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Ticket[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Real-time loop
  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const [statsRes, logsRes] = await Promise.all([
          apiFetch('/admin/dev/database-stats'),
          apiFetch('/admin/dev/system-logs')
        ]);
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setDbStats(statsData);
        }
        
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.logs || []);
        }
      } catch (err) {
        console.error('Failed to fetch real-time dev data:', err);
      } finally {
        setTimeout(() => setIsFetching(false), 200); // Visual pulse duration
      }
    };

    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Debounced Search
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await apiFetch(`/admin/dev/tickets/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.tickets || []);
        }
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const StatusBadge = ({ status }: { status: string }) => {
    let colors = 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    if (status === 'VALID') colors = 'bg-green-500/20 text-green-400 border-green-500/50';
    if (status === 'USED') colors = 'bg-red-500/20 text-red-400 border-red-500/50';
    if (status === 'CANCELLED') colors = 'bg-gray-800 text-gray-500 border-gray-700';

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider ${colors}`}>
        {status}
      </span>
    );
  };

  const handleForceValidate = async (ticketId: string) => {
    try {
      const res = await apiFetch('/admin/tickets/validate', {
        method: 'POST',
        body: JSON.stringify({ ticketId })
      });
      if (res.ok) {
        alert(`SUCCESS: Ticket ${ticketId} has been validated.`);
        setSearchResults(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'USED' } : t));
      } else {
        const err = await res.json();
        alert(`ERROR: ${err.error || 'Failed to validate ticket'}`);
      }
    } catch (error) {
      alert('Network error while validating ticket.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-6 selection:bg-green-500/30">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-green-900/50 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6" />
          <h1 className="text-xl font-bold tracking-widest uppercase">/admin/dev <span className="text-green-800">_la_caja_negra</span></h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-700">SYSTEM.STATUS</span>
          <div className="flex items-center gap-1.5 bg-green-950 border border-green-900 px-3 py-1 rounded-full">
            <Activity className={`w-3 h-3 ${isFetching ? 'text-white' : 'text-green-500'} transition-colors duration-200`} />
            <span className={isFetching ? 'text-white' : 'text-green-500'}>
              {isFetching ? 'SYNCING...' : 'ONLINE'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* SECTION 1: God Mode Search */}
        <div className="bg-[#050f05] border border-green-900/50 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4 text-green-600">
            <Search className="w-4 h-4" />
            <h2 className="text-sm font-bold uppercase tracking-widest">God Mode Ticket Search</h2>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search by QR ID, Name, or Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-green-800 rounded p-3 text-green-400 placeholder-green-800 focus:outline-none focus:border-green-500 transition-colors font-mono text-sm"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-green-800 border-t-green-400 rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 overflow-x-auto border border-green-900/50 rounded">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-green-950/30 text-green-700 border-b border-green-900/50">
                  <tr>
                    <th className="px-4 py-2 font-normal">TICKET_ID</th>
                    <th className="px-4 py-2 font-normal">BUYER</th>
                    <th className="px-4 py-2 font-normal">EVENT</th>
                    <th className="px-4 py-2 font-normal">STATUS</th>
                    <th className="px-4 py-2 font-normal">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-900/30">
                  {searchResults.map((t) => (
                    <tr key={t.id} className="hover:bg-green-900/10 transition-colors">
                      <td className="px-4 py-2 text-green-600 font-bold">{t.id}</td>
                      <td className="px-4 py-2">
                        <div className="text-green-300">{t.name}</div>
                        <div className="text-green-700 text-[10px]">{t.email}</div>
                      </td>
                      <td className="px-4 py-2 text-green-500">
                        {t.event.name} <span className="text-green-800">({t.ticketType.name})</span>
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-2">
                        {t.status === 'VALID' && (
                          <button
                            onClick={() => handleForceValidate(t.id)}
                            className="bg-green-900/40 text-green-400 border border-green-500/50 px-2 py-1 rounded text-[10px] hover:bg-green-500 hover:text-black transition-colors uppercase font-bold tracking-wider"
                          >
                            Force Validate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="mt-4 text-xs text-green-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> NO_RESULTS_FOUND
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* SECTION 2: Database Explorer */}
          <div className="bg-[#050f05] border border-green-900/50 rounded-lg p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4 text-green-600">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <h2 className="text-sm font-bold uppercase tracking-widest">Live Database Stats</h2>
              </div>
              <span className="text-[10px] text-green-800">REFRESH_RATE: 3000ms</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'EVENTS', val: dbStats?.counts?.events },
                { label: 'TICKETS', val: dbStats?.counts?.tickets },
                { label: 'EXPENSES', val: dbStats?.counts?.expenses },
                { label: 'USERS', val: dbStats?.counts?.users }
              ].map(stat => (
                <div key={stat.label} className="bg-black border border-green-900/50 rounded p-3">
                  <div className="text-[10px] text-green-700 mb-1">{stat.label}</div>
                  <div className="text-xl text-green-400 font-bold">{stat.val ?? '--'}</div>
                </div>
              ))}
            </div>

            <div className="flex-1 bg-black border border-green-900/50 rounded overflow-hidden flex flex-col h-[300px]">
              <div className="bg-green-950/30 text-[10px] text-green-700 px-3 py-1.5 border-b border-green-900/50 uppercase">
                Recent_Tickets_JSON
              </div>
              <div className="flex-1 max-h-96 overflow-y-auto p-4 bg-gray-900/50 rounded-b text-[11px] leading-relaxed">
                {dbStats ? (
                  <pre className="text-green-500 whitespace-pre-wrap">
                    {JSON.stringify(dbStats.recentTickets, null, 2)}
                  </pre>
                ) : (
                  <div className="text-green-800 animate-pulse">Loading data payload...</div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: System Logs */}
          <div className="bg-[#050f05] border border-green-900/50 rounded-lg p-5 flex flex-col h-[500px]">
            <div className="flex items-center gap-2 mb-4 text-green-600">
              <Server className="w-4 h-4" />
              <h2 className="text-sm font-bold uppercase tracking-widest">System Audit Logs</h2>
            </div>
            
            <div className="flex-1 bg-black border border-green-900/50 rounded p-3 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-green-800 text-xs">Waiting for system events...</div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log) => {
                    let colorClass = 'text-gray-500';
                    let Icon = null;
                    if (log.severity === 'CRITICAL') {
                      colorClass = 'text-red-500 font-bold';
                      Icon = AlertTriangle;
                    } else if (log.severity === 'ERROR') {
                      colorClass = 'text-red-400';
                    } else if (log.severity === 'WARNING') {
                      colorClass = 'text-yellow-500';
                    }

                    return (
                      <div key={log.id} className="text-[11px] flex gap-3 hover:bg-green-900/20 px-1 py-0.5 rounded group items-start">
                        <span className="text-green-900 shrink-0 mt-0.5">[{new Date(log.timestamp).toISOString()}]</span>
                        <div className={`flex flex-col flex-1 ${colorClass}`}>
                          <div className="flex items-center gap-1.5">
                            {Icon && <Icon className="w-3 h-3" />}
                            <span className="uppercase tracking-wider">{log.severity}</span>
                            <span className="mx-1 opacity-50">-</span>
                            <span className="font-bold">{log.action}</span>
                          </div>
                          <span className="mt-0.5 opacity-80 whitespace-pre-wrap break-words w-full max-w-full">
                            {log.details || 'null'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
