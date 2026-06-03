interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  order: number;
}

interface GalleryProps {
  showGallery: boolean;
  galleryTitle?: string | null;
  images: GalleryImage[];
}

export function Gallery({ showGallery, galleryTitle, images }: GalleryProps) {
  if (!showGallery || !images || images.length === 0) return null;

  const getGridItemClass = (index: number) => {
    const patterns = [
      'col-span-2 md:col-span-8 md:row-span-2 h-[320px] md:h-auto',
      'col-span-1 md:col-span-4 md:row-span-1 h-[160px] md:h-auto',
      'col-span-1 md:col-span-4 md:row-span-1 h-[160px] md:h-auto',
      'col-span-1 md:col-span-6 md:row-span-1 h-[200px] md:h-auto',
      'col-span-1 md:col-span-6 md:row-span-1 h-[200px] md:h-auto',
    ];
    return patterns[index % patterns.length];
  };

  return (
    <section className="bg-bg py-24 px-6 border-b-2 border-border select-none">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="flex flex-col items-start mb-12">
          <span className="section-label mb-2">Galería</span>
          <h2 className="font-display text-4xl md:text-5xl uppercase tracking-tighter text-white">
            {galleryTitle || 'LO QUE FUE'}
          </h2>
        </div>

        {/* Asymmetric Grid with brutalist hard borders */}
        <div className="gallery-grid">
          {images.map((img, idx) => (
            <div
              key={img.id || idx}
              className={`${getGridItemClass(idx)} relative overflow-hidden group brut-border`}
            >
              <img
                src={img.url}
                alt={img.alt || 'Event image'}
                className="w-full h-full object-cover grayscale contrast-[1.15] group-hover:grayscale-0 group-hover:scale-102 transition-all duration-300 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all duration-300 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
