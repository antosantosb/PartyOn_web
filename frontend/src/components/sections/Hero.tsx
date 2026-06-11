import { MapPin, Clock } from 'lucide-react';
import { getCleanImageUrl } from '../../config/api';

interface HeroProps {
  eventData: {
    partyName: string;
    tagline?: string;
    date: string;
    location: string;
    startsAt?: string | null;
    endsAt?: string | null;
    lineup?: string | null;
    ctaLabel?: string;
  };
  theme: {
    backgroundImage?: string | null;
    backgroundImageMobile?: string | null;
  };
}

export function Hero({ eventData, theme }: HeroProps) {
  const hasLineup = !!eventData.lineup && eventData.lineup.trim() !== '';

  const handleScrollToTickets = () => {
    document.getElementById('tickets-section')?.scrollIntoView({ behavior: 'smooth' });
  };
  const handleScrollToLineup = () => {
    document.getElementById('lineup-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const desktopBg = getCleanImageUrl(theme.backgroundImage || '/hero.jpg');
  const mobileBg = getCleanImageUrl(theme.backgroundImageMobile) || desktopBg;

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Lisbon',
      });
    } catch {
      return '';
    }
  };

  const startTime = formatTime(eventData.startsAt);
  const endTime   = formatTime(eventData.endsAt);

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100svh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '0 1.5rem 5rem',
        overflow: 'hidden',
      }}
    >
      {/* BG */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <picture>
          <source media="(min-width:768px)" srcSet={desktopBg} />
          <img
            src={mobileBg}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
        </picture>
        {/* Gradient overlay — dark from bottom, subtle on top */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(17,17,17,0.97) 0%, rgba(17,17,17,0.55) 45%, rgba(0,0,0,0.15) 100%)',
          }}
        />
        {/* Left accent line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '3px',
            background: 'var(--accent)',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '960px', width: '100%' }}>
        {/* Date pill */}
        <div
          style={{
            display: 'inline-block',
            background: 'var(--accent)',
            color: '#fff',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            padding: '0.4rem 0.85rem',
            marginBottom: '1.25rem',
          }}
        >
          {eventData.date}
        </div>

        {/* Event name */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3.5rem, 12vw, 9rem)',
            lineHeight: 0.88,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: '#fff',
            margin: '0 0 1.25rem',
            wordBreak: 'break-word',
          }}
        >
          {eventData.partyName}
        </h1>

        {/* Tagline */}
        {eventData.tagline && (
          <p
            style={{
              color: 'rgba(240,237,232,0.55)',
              fontSize: '1.05rem',
              fontWeight: 500,
              letterSpacing: '0.04em',
              marginBottom: '2rem',
              maxWidth: '480px',
            }}
          >
            {eventData.tagline}
          </p>
        )}

        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '2.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: '2px solid rgba(42,42,42,0.9)',
              padding: '0.45rem 0.85rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              background: 'rgba(17,17,17,0.7)',
            }}
          >
            <MapPin size={12} color="var(--accent)" />
            <span style={{ color: 'var(--text)' }}>{eventData.location}</span>
          </div>
          {startTime && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '2px solid rgba(42,42,42,0.9)',
                padding: '0.45rem 0.85rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                background: 'rgba(17,17,17,0.7)',
              }}
            >
              <Clock size={12} color="var(--accent)" />
              <span style={{ color: 'var(--text)' }}>
                {startTime}{endTime ? ` — ${endTime}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            className="brut-btn"
            onClick={handleScrollToTickets}
            id="hero-tickets-btn"
            style={{ fontSize: '0.75rem', padding: '1rem 2rem' }}
          >
            {eventData.ctaLabel || 'COMPRAR ENTRADA'}
          </button>
        </div>
      </div>
    </section>
  );
}
