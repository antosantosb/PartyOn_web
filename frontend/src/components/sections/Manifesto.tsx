interface ManifestoProps {
  manifesto?: string | null;
  manifestoLabel?: string | null;
}

export function Manifesto({ manifesto, manifestoLabel }: ManifestoProps) {
  if (!manifesto || manifesto.trim() === '') return null;

  return (
    <section className="bg-accent text-white py-32 px-6 relative overflow-hidden select-none border-b-2 border-border">
      {/* Huge background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
        <span className="font-display text-[20vw] whitespace-nowrap select-none text-white leading-none uppercase">
          PARTY ON
        </span>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
        {/* Label */}
        {manifestoLabel && (
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-white/70 mb-8 font-bold">
            {manifestoLabel}
          </p>
        )}

        {/* Big centered Manifesto content */}
        <h2 className="font-display text-4xl md:text-6xl lg:text-7xl uppercase leading-[0.95] tracking-tighter max-w-3xl text-white">
          "{manifesto}"
        </h2>
      </div>
    </section>
  );
}
