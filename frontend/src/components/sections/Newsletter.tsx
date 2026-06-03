import React, { useState } from 'react';

interface NewsletterProps {
  showNewsletter: boolean;
  newsletterText?: string | null;
  newsletterSubtext?: string | null;
}

export function Newsletter({
  showNewsletter,
  newsletterText,
  newsletterSubtext
}: NewsletterProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  if (!showNewsletter) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Por favor, introduce un correo electrónico válido.');
      return;
    }

    console.log('Subscribing:', email);
    setSubscribed(true);
    setEmail('');
  };

  return (
    <section className="bg-bg py-24 px-6 border-b-2 border-border relative">
      <div className="max-w-xl mx-auto text-center">
        <span className="section-label mb-3 block">Newsletter</span>
        
        <h2 className="font-display text-4xl md:text-5xl uppercase tracking-tighter text-white mb-4">
          {newsletterText || 'ÚNETE AL PULSO'}
        </h2>
        
        {newsletterSubtext && (
          <p className="text-sm text-text-muted mb-10 max-w-md mx-auto">
            {newsletterSubtext}
          </p>
        )}

        {subscribed ? (
          <div className="brut-border-accent bg-accent/5 p-6 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-accent font-bold">
              ✓ ¡Te has unido con éxito!
            </p>
            <p className="text-xs text-text-muted mt-1">
              Te enviaremos preventas y códigos de descuento exclusivos.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="email"
                placeholder="TU CORREO ELECTRÓNICO"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-white font-mono text-xs uppercase tracking-widest py-3 px-1 border-b-2 border-border focus:border-accent focus:outline-none transition-colors"
                aria-label="Correo electrónico para newsletter"
              />
              {error && (
                <p className="text-left font-mono text-[10px] text-accent mt-2 uppercase tracking-wider">
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="brut-btn w-full mt-2"
            >
              REGISTRARSE
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
