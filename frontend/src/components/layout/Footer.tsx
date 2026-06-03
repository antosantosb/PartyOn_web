export function Footer({ logoUrl }: { logoUrl?: string }) {
  const currentYear = new Date().getFullYear();

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

        {/* Social / Support Links - In bordered boxes */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <a
            href="https://www.instagram.com/party.on.pt"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] uppercase tracking-widest text-text-muted hover:text-accent hover:border-accent border border-border px-4 py-2 transition-colors"
          >
            Instagram
          </a>
          <a
            href="#"
            className="font-mono text-[10px] uppercase tracking-widest text-text-muted hover:text-accent hover:border-accent border border-border px-4 py-2 transition-colors"
          >
            Soporte
          </a>
          <a
            href="#"
            className="font-mono text-[10px] uppercase tracking-widest text-text-muted hover:text-accent hover:border-accent border border-border px-4 py-2 transition-colors"
          >
            Privacidad
          </a>
        </div>

        {/* Copyright and Legal Block */}
        <div className="text-center md:text-right">
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-widest">
            © {currentYear} PARTYON. TODOS LOS DERECHOS RESERVADOS.
          </p>
          <p className="font-mono text-[8px] text-text-faint mt-1 tracking-widest uppercase">
            CREADO POR PARTYON TECH TEAM.
          </p>
        </div>

      </div>
    </footer>
  );
}
