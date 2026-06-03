import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/api';
import { apiFetch } from './api-client';

export const defaultEventData = {
  id: '',
  name: "EL PERREO INTENSO",
  partyName: "EL PERREO INTENSO", // compatibility alias
  isPublished: false,
  tagline: "",
  date: "SÁBADO 15 NOVIEMBRE",
  startsAt: null as string | null,
  endsAt: null as string | null,
  location: "BRAGA",
  lineup: "",
  tickerText: "",
  manifesto: "",
  manifestoLabel: "",
  ctaLabel: "COMPRAR ENTRADA",
  showGallery: false,
  galleryTitle: "",
  galleryImages: [] as { id: string; url: string; alt: string | null; order: number }[],
  showNewsletter: false,
  newsletterText: "",
  newsletterSubtext: "",
  logoText1: "PARTY",
  emailSubject: "Tu entrada para PartyOn",
  emailBody: "Gracias por tu compra. Te adjuntamos las entradas en este correo.",
  ticketTypes: [] as {
    id: string;
    eventId: string;
    name: string;
    description: string | null;
    price: number;
    maxStock: number;
    soldCount: number;
    saleStartsAt: string | null;
    saleEndsAt: string | null;
    forceSoldOut: boolean;
    isArchived: boolean;
    isDoorType: boolean;
  }[]
};

export const defaultTheme = {
  id: '',
  primaryColor: "#e63329",
  backgroundImage: "/hero.jpg",
  backgroundImageMobile: ""
};

const CACHE_KEYS = [
  'id', 'name', 'partyName', 'tagline', 'date', 'startsAt', 'endsAt', 'location',
  'lineup', 'tickerText', 'manifesto', 'manifestoLabel', 'ctaLabel', 'showGallery',
  'galleryTitle', 'showNewsletter', 'newsletterText', 'newsletterSubtext',
  'logoText1', 'emailSubject', 'emailBody', 'ticketTypes', 'galleryImages'
] as const;

function pickCacheFields(data: any) {
  const out: any = {};
  for (const k of CACHE_KEYS) {
    if (k in data) out[k] = data[k];
  }
  return out;
}

export function useStore() {
  const [eventData, setEventDataState] = useState<typeof defaultEventData>(() => {
    const saved = localStorage.getItem('partyon_event');
    const cached = saved ? JSON.parse(saved) : {};
    return { ...defaultEventData, ...cached, ticketTypes: [], galleryImages: [] };
  });

  const [theme, setThemeState] = useState<typeof defaultTheme>(() => {
    const saved = localStorage.getItem('partyon_theme');
    return saved ? JSON.parse(saved) : defaultTheme;
  });

  const [loading, setLoading] = useState(true);

  const eventRef = useRef(eventData);
  const themeRef = useRef(theme);
  useEffect(() => { eventRef.current = eventData; }, [eventData]);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  // Fetch active event
  useEffect(() => {
    fetch(`${API_BASE}/events/active`)
      .then(res => res.json())
      .then(data => {
        if (data.event) {
          const fresh: typeof defaultEventData = {
            ...defaultEventData,
            ...data.event,
            partyName: data.event.name, // compatibility
            ticketTypes: data.event.ticketTypes ?? [],
            galleryImages: data.event.galleryImages ?? []
          };
          setEventDataState(fresh);
          localStorage.setItem('partyon_event', JSON.stringify(pickCacheFields(fresh)));

          if (data.event.theme) {
            setThemeState(data.event.theme);
            localStorage.setItem('partyon_theme', JSON.stringify(data.event.theme));
          }
        }
        setLoading(false);
      })
      .catch(e => {
        console.error('API unavailable — using local cache. Ticket availability may be stale.', e);
        setLoading(false);
      });
  }, []);

  const saveEventData = async (newData: typeof defaultEventData) => {
    setEventDataState(newData);
    localStorage.setItem('partyon_event', JSON.stringify(pickCacheFields(newData)));

    if (!newData.id) return;

    await apiFetch(`/admin/events/${newData.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: newData.name || newData.partyName,
        isPublished: newData.isPublished,
        tagline: newData.tagline || null,
        date: newData.date,
        startsAt: newData.startsAt,
        endsAt: newData.endsAt,
        location: newData.location,
        lineup: newData.lineup || null,
        tickerText: newData.tickerText || null,
        manifesto: newData.manifesto || null,
        manifestoLabel: newData.manifestoLabel || null,
        ctaLabel: newData.ctaLabel || 'COMPRAR ENTRADA',
        logoText1: newData.logoText1,
        emailSubject: newData.emailSubject,
        emailBody: newData.emailBody,
        showGallery: newData.showGallery,
        galleryTitle: newData.galleryTitle || null,
        showNewsletter: newData.showNewsletter,
        newsletterText: newData.newsletterText || null,
        newsletterSubtext: newData.newsletterSubtext || null
      })
    }).catch(e => console.warn('API save failed:', e));
  };

  const saveTheme = async (newTheme: typeof defaultTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('partyon_theme', JSON.stringify(newTheme));

    if (!eventRef.current.id) return;

    await apiFetch(`/admin/events/${eventRef.current.id}/theme`, {
      method: 'PATCH',
      body: JSON.stringify(newTheme)
    }).catch(e => console.warn('API theme save failed:', e));
  };

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
