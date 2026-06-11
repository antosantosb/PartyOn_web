import React from 'react';
import { useTranslation } from 'react-i18next';

interface LineupProps {
  lineup?: string | null;
}

export function Lineup({ lineup }: LineupProps) {
  const { t } = useTranslation();
  if (!lineup || lineup.trim() === '') return null;

  const artists = lineup.split(',').map((s) => s.trim()).filter(Boolean);

  return (
    <section
      id="lineup-section"
      className="bg-bg py-12 px-6 border-b-2 border-accent relative text-center"
    >
      <div className="max-w-3xl mx-auto">
        <span className="section-label mb-3 block">{t('storefront.lineup')}</span>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {artists.map((artist, idx) => (
            <React.Fragment key={idx}>
              <span className="font-mono text-xs md:text-sm uppercase tracking-widest text-text hover:text-accent transition-colors">
                {artist}
              </span>
              {idx < artists.length - 1 && (
                <span className="text-text-faint text-xs select-none">/</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
