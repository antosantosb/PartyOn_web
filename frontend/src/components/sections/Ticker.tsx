interface TickerProps {
  tickerText?: string | null;
}

export function Ticker({ tickerText }: TickerProps) {
  if (!tickerText || tickerText.trim() === '') return null;

  // We split the ticker text by commas to showcase them cleanly, or default to a repeated sequence
  const parts = tickerText.split(',').map(t => t.trim()).filter(Boolean);
  const repeatedParts = [...parts, ...parts, ...parts, ...parts, ...parts, ...parts];

  return (
    <div className="w-full bg-bg text-white overflow-hidden py-5 border-y-2 border-accent select-none relative z-10">
      <div className="animate-ticker-slow flex whitespace-nowrap items-center">
        {repeatedParts.map((text, i) => (
          <span
            key={i}
            className="inline-block text-5xl md:text-7xl font-display uppercase tracking-tighter mx-8 text-accent"
          >
            {text}
            <span className="ml-16 text-white/10 select-none font-sans font-light">★</span>
          </span>
        ))}
      </div>
    </div>
  );
}
