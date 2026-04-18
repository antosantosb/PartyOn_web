import { useState, useEffect } from 'react';

// Fallbacks
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
  ticketTypes: [
    { id: 'general', name: 'General', price: 15, stock: 150 },
    { id: 'vip', name: 'VIP', price: 30, stock: 0 },
  ]
};

export const defaultTheme = {
  id: '',
  primaryColor: "#00ffcc",
  secondaryColor: "#ff007f",
  backgroundImage: "/hero.jpg",
};

const API_BASE = 'http://localhost:3000/api';

export function useStore() {
  const [eventData, setEventData] = useState(() => {
    const saved = localStorage.getItem('partyon_event');
    return saved ? JSON.parse(saved) : defaultEventData;
  });

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('partyon_theme');
    return saved ? JSON.parse(saved) : defaultTheme;
  });

  const [loading, setLoading] = useState(true);

  // Fetch from Backend
  useEffect(() => {
    fetch(`${API_BASE}/store-data`)
      .then(res => res.json())
      .then(data => {
        if (data.eventData) {
          // Merge DB fields with localStorage extra fields (tagline, lineup)
          const saved = localStorage.getItem('partyon_event');
          const localExtra = saved ? JSON.parse(saved) : {};
          const newEventData = {
            ...localExtra,          // keeps tagline/lineup from local
            ...data.eventData,      // DB fields override
            partyName: data.eventData.name
          };
          setEventData(newEventData);
          localStorage.setItem('partyon_event', JSON.stringify(newEventData));
        }
        if (data.theme) {
          setTheme(data.theme);
          localStorage.setItem('partyon_theme', JSON.stringify(data.theme));
        }
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to fetch API store data, dropping back to local storage", e);
        setLoading(false);
      });
  }, []);

  // Save event data — persist to localStorage immediately, then sync DB-known fields
  const saveEventData = async (newData: any) => {
    setEventData(newData);
    localStorage.setItem('partyon_event', JSON.stringify(newData));
    // Only send fields the DB schema knows about
    const dbPayload = {
      id: newData.id,
      partyName: newData.partyName,
      date: newData.date,
      location: newData.location,
      artistInfo: newData.artistInfo,
      logoText1: newData.logoText1,
      logoText2: newData.logoText2,
    };
    await fetch(`${API_BASE}/store-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventData: dbPayload, theme: newData.__themeSnapshot })
    }).catch(e => console.warn('API save failed (offline mode ok):', e));
  };

  const saveTheme = async (newTheme: any) => {
    setTheme(newTheme);
    localStorage.setItem('partyon_theme', JSON.stringify(newTheme));
    // Get the latest eventData from localStorage to avoid stale closure
    const savedEvent = localStorage.getItem('partyon_event');
    const latestEvent = savedEvent ? JSON.parse(savedEvent) : {};
    await fetch(`${API_BASE}/store-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventData: latestEvent, theme: newTheme })
    }).catch(e => console.warn('API save failed (offline mode ok):', e));
  };

  // Cross tab sync
  useEffect(() => {
    const handleStorage = () => {
      const savedEvent = localStorage.getItem('partyon_event');
      if (savedEvent) setEventData(JSON.parse(savedEvent));
      
      const savedTheme = localStorage.getItem('partyon_theme');
      if (savedTheme) setTheme(JSON.parse(savedTheme));
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
