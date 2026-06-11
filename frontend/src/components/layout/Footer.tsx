import React from 'react';
import { useTranslation } from 'react-i18next';

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export function Footer({ logoUrl }: { logoUrl?: string }) {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  return (
    <footer className="bg-bg-alt border-t-2 border-border py-16 px-6 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">

        {/* Brand Block */}
        <div className="flex flex-col items-center md:items-start gap-3">
          <img
            src={(logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('/'))) ? logoUrl : "/logo.PNG"}
            alt="PartyOn Logo"
            className="h-14 w-auto object-contain opacity-90"
          />
          <p className="font-mono text-[9px] text-text-faint uppercase tracking-widest">
            Braga, Portugal
          </p>
        </div>

        {/* Social Link */}
        <div className="flex items-center justify-center w-full md:w-auto">
          <a
            href="https://www.instagram.com/party.on.pt"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted hover:text-accent border border-border hover:border-accent bg-[#161616]/40 hover:bg-accent/5 px-6 py-3.5 transition-all duration-300"
          >
            <InstagramIcon className="w-4 h-4 text-text-muted group-hover:text-accent group-hover:scale-110 transition-all duration-300" />
            <span>@party.on.pt</span>
          </a>
        </div>

        {/* Copyright and Legal Block */}
        <div className="text-center md:text-right">
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-widest">
            {t('footer.rightsReserved', { year: currentYear })}
          </p>
          <p className="font-mono text-[8px] text-text-faint mt-1 tracking-widest uppercase">
            {t('footer.createdBy')}
          </p>
        </div>

      </div>
    </footer>
  );
}
