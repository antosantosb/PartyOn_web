import { useState, useEffect, useRef } from 'react';

// UI-only fallback (no ticketTypes — always fetched live from the API)
export const defaultEventData = {
  id: '',
  partyName: "NOSTALGIA",
  tagline: "",
  date: "SÁBADO 15 NOVIEMBRE",
  startsAt: null as string | null,
  endsAt: null as string | null,
  location: "BRAGA",
  artistInfo: "DJ SANTOS",
  lineup: "",
  logoText1: "PARTY",
  logoText2: "ON",
  emailSubject: "Tu entrada para PartyOn",
  emailBody: "Gracias por tu compra. Te adjuntamos las entradas en este correo.",
  ticketTypes: [] as {
    id: string; name: string; price: number; maxStock: number; soldCount: number;
    saleStartsAt: string | null; saleEndsAt: string | null; forceSoldOut: boolean;
  }[]
};

export const defaultTheme = {
  id: '',
  primaryColor: "#00ffcc",
  secondaryColor: "#ff007f",
  backgroundImage: "/hero.jpg",
};

import { API_BASE } from '../config/api';


// Fields we cache in localStorage (no ticket/financial data)
const CACHE_KEYS = [
  'id', 'partyName', 'tagline', 'date', 'startsAt', 'endsAt', 'location',
  'artistInfo', 'lineup', 'logoText1', 'logoText2', 'emailSubject', 'emailBody', 'ticketTypes'
] as const;

function pickCacheFields(data: any) {
  const out: any = {};
  for (const k of CACHE_KEYS) if (k in data) out[k] = data[k];
  return out;
}

export function useStore() {
  const [eventData, setEventDataState] = useState<typeof defaultEventData>(() => {
    const saved = localStorage.getItem('partyon_event');
    const cached = saved ? JSON.parse(saved) : {};
    return { ...defaultEventData, ...cached, ticketTypes: [] };
  });

  const [theme, setThemeState] = useState<typeof defaultTheme>(() => {
    const saved = localStorage.getItem('partyon_theme');
    return saved ? JSON.parse(saved) : defaultTheme;
  });

  const [loading, setLoading] = useState(true);

  // Always-current refs so async save functions never have stale values
  const eventRef = useRef(eventData);
  const themeRef = useRef(theme);
  useEffect(() => { eventRef.current = eventData; }, [eventData]);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  // Fetch fresh data from backend on mount — ticketTypes ONLY come from here
  useEffect(() => {
    fetch(`${API_BASE}/store-data`)
      .then(res => res.json())
      .then(data => {
        if (data.eventData) {
          // Preserve localStorage extras (tagline, lineup) that backend may not have yet
          const cached = localStorage.getItem('partyon_event');
          const localExtra = cached ? JSON.parse(cached) : {};
          const fresh: typeof defaultEventData = {
            ...defaultEventData,
            ...localExtra,
            ...data.eventData,
            partyName: data.eventData.name,
            ticketTypes: data.eventData.ticketTypes ?? []
          };
          setEventDataState(fresh);
          localStorage.setItem('partyon_event', JSON.stringify(pickCacheFields(fresh)));
        }
        if (data.theme) {
          setThemeState(data.theme);
          localStorage.setItem('partyon_theme', JSON.stringify(data.theme));
        }
        setLoading(false);
      })
      .catch(e => {
        console.error('API unavailable — using local cache. Ticket availability may be stale.', e);
        setLoading(false);
      });
  }, []);

  // Save event data — update state + localStorage + backend (non-blocking on error)
  const saveEventData = async (newData: typeof defaultEventData) => {
    setEventDataState(newData);
    localStorage.setItem('partyon_event', JSON.stringify(pickCacheFields(newData)));

    // Use themeRef so we always send the latest theme, not a stale closure
    await fetch(`${API_BASE}/store-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventData: {
          id: newData.id,
          partyName: newData.partyName,
          tagline: newData.tagline ?? null,
          date: newData.date,
          startsAt: newData.startsAt ?? null,
          endsAt: newData.endsAt ?? null,
          location: newData.location,
          artistInfo: newData.artistInfo,
          lineup: newData.lineup ?? null,
          logoText1: newData.logoText1,
          logoText2: newData.logoText2,
          emailSubject: newData.emailSubject,
          emailBody: newData.emailBody,
        },
        theme: themeRef.current
      })
    }).catch(e => console.warn('API save failed (offline mode):', e));
  };

  // Save theme — use eventRef so we always send latest event data
  const saveTheme = async (newTheme: typeof defaultTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('partyon_theme', JSON.stringify(newTheme));

    await fetch(`${API_BASE}/store-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventData: {
          id: eventRef.current.id,
          partyName: eventRef.current.partyName,
          tagline: eventRef.current.tagline ?? null,
          date: eventRef.current.date,
          startsAt: eventRef.current.startsAt ?? null,
          endsAt: eventRef.current.endsAt ?? null,
          location: eventRef.current.location,
          artistInfo: eventRef.current.artistInfo,
          lineup: eventRef.current.lineup ?? null,
          logoText1: eventRef.current.logoText1,
          logoText2: eventRef.current.logoText2,
          emailSubject: eventRef.current.emailSubject,
          emailBody: eventRef.current.emailBody,
        },
        theme: newTheme
      })
    }).catch(e => console.warn('API save failed (offline mode):', e));
  };

  // Cross-tab sync (non-ticket fields only)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'partyon_event' && e.newValue) {
        const cached = JSON.parse(e.newValue);
        setEventDataState(prev => ({ ...prev, ...cached }));
      }
      if (e.key === 'partyon_theme' && e.newValue) {
        setThemeState(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    eventData,
    setEventData: saveEventData,
    theme,
    setTheme: saveTheme,
    loading
  };
}
