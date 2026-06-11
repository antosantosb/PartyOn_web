import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface NavProps {
  ctaLabel?: string;
  logoUrl?: string;
}

export function Nav({ ctaLabel = 'ENTRADAS', logoUrl }: NavProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTickets = () => {
    document.getElementById('tickets-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        borderBottom: `2px solid ${isScrolled ? '#2a2a2a' : 'transparent'}`,
        backgroundColor: isScrolled ? 'rgba(17,17,17,0.97)' : 'transparent',
        transition: 'background-color 0.25s, border-color 0.25s',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1.5rem',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={(logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('/'))) ? logoUrl : "/logo.PNG"}
            alt="PartyOn"
            style={{ height: '72px', maxHeight: '90%', maxWidth: '100%', objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </Link>
      </div>
    </nav>
  );
}
