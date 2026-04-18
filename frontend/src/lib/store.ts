import { useState, useEffect } from 'react';

// UI-only fallback (no ticketTypes — those must always come from the API)
export const defaultEventData = {
  id: '',
  partyName: "EL PERREO INTENSO",
  tagline: "La noche que no olvidarás",
  date: "SÁBADO 15 NOVIEMBRE",
  location: "CLUB NOSTALGIA, MADRID",
  artistInfo: "DJ ALVARO + GUEST STARS",
  lineup: "DJ Álvaro, MC Regueton, La Reina Latina",
  logoText1: "PARTY",
  logoText2: "ON",
  // ticketTypes intentionally omitted — always fetched live from the API
  // so stale stock numbers are never shown to buyers
  ticketTypes: [] as { id: string; name: string; price: number; stock: number }[]
};

export const defaultTheme = {
  id: '',
  primaryColor: "#00ffcc",
  secondaryColor: "#ff007f",
  backgroundImage: "/hero.jpg",
};

const API_BASE = 'http://localhost:3000/api';

// Fields that are persisted in localStorage (non-ticket UI fields)
const EVENT_CACHE_FIELDS = [
  'id', 'partyName', 'tagline', 'date', 'location',
  'artistInfo', 'lineup', 'logoText1', 'logoText2'
] as const;

type CachedEventData = typeof defaultEventData;

function pickCacheFields(data: any): Partial<CachedEventData> {
  const result: any = {};
  for (const key of EVENT_CACHE_FIELDS) {
    if (key in data) result[key] = data[key];
  }
  return result;
}

export function useStore() {
  const [eventData, setEventDataState] = useState<CachedEventData>(() => {
    // Load non-ticket fields from localStorage for instant display
    const saved = localStorage.getItem('partyon_event');
    const cached = saved ? JSON.parse(saved) : {};
    return { ...defaultEventData, ...cached, ticketTypes: [] }; // ticketTypes always empty until API responds
  });

  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('partyon_theme');
    return saved ? JSON.parse(saved) : defaultTheme;
  });

  const [loading, setLoading] = useState(true);

  // Fetch fresh data from backend — ticketTypes ONLY come from here
  useEffect(() => {
    fetch(`${API_BASE}/store-data`)
      .then(res => res.json())
      .then(data => {
        if (data.eventData) {
          const newEventData: CachedEventData = {
            ...defaultEventData,
            ...data.eventData,
            partyName: data.eventData.name,
            // ticketTypes come exclusively from the DB, never from cache
            ticketTypes: data.eventData.ticketTypes ?? []
          };
          setEventDataState(newEventData);
          // Only cache non-ticket fields
          localStorage.setItem('partyon_event', JSON.stringify(pickCacheFields(newEventData)));
        }
        if (data.theme) {
          setThemeState(data.theme);
          localStorage.setItem('partyon_theme', JSON.stringify(data.theme));
        }
        setLoading(false);
      })
      .catch(e => {
        console.error("API unavailable, using local cache. Ticket stock may be stale.", e);
        setLoading(false);
      });
  }, []);

  // Save event data to localStorage (non-ticket fields) + persist to DB
  const saveEventData = async (newData: CachedEventData) => {
    setEventDataState(newData);
    localStorage.setItem('partyon_event', JSON.stringify(pickCacheFields(newData)));

    await fetch(`${API_BASE}/store-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventData: {
          id: newData.id,
          partyName: newData.partyName,
          tagline: newData.tagline,
          date: newData.date,
          location: newData.location,
          artistInfo: newData.artistInfo,
          lineup: newData.lineup,
          logoText1: newData.logoText1,
          logoText2: newData.logoText2,
        },
        theme
      })
    }).catch(e => console.warn('API save failed (offline mode):', e));
  };

  const saveTheme = async (newTheme: typeof defaultTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('partyon_theme', JSON.stringify(newTheme));

    // Read latest event from state (not localStorage) since we have it in memory
    await fetch(`${API_BASE}/store-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventData: {
          id: eventData.id,
          partyName: eventData.partyName,
          tagline: eventData.tagline,
          date: eventData.date,
          location: eventData.location,
          artistInfo: eventData.artistInfo,
          lineup: eventData.lineup,
          logoText1: eventData.logoText1,
          logoText2: eventData.logoText2,
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
