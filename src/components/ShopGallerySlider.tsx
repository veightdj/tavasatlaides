import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  alt?: string;
  className?: string;
};

export function ShopGallerySlider({ images, alt = "Shop image", className }: Props) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const count = images.length;
  const goTo = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count]
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  if (count === 0) return null;

  return (
    <>
      <SliderTrack
        images={images}
        alt={alt}
        index={index}
        onChange={goTo}
        onNext={next}
        onPrev={prev}
        onOpen={() => setLightbox(true)}
        className={className}
        rounded
      />
      {lightbox && (
        <Lightbox
          images={images}
          alt={alt}
          index={index}
          onChange={goTo}
          onNext={next}
          onPrev={prev}
          onClose={() => setLightbox(false)}
        />
      )}
    </>
  );
}

function SliderTrack({
  images,
  alt,
  index,
  onChange,
  onNext,
  onPrev,
  onOpen,
  className,
  rounded,
  full,
}: {
  images: string[];
  alt: string;
  index: number;
  onChange: (i: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onOpen?: () => void;
  className?: string;
  rounded?: boolean;
  full?: boolean;
}) {
  const startX = useRef<number | null>(null);
  const deltaX = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [drag, setDrag] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const onDown = (x: number) => {
    startX.current = x;
    deltaX.current = 0;
    setDragging(true);
  };
  const onMove = (x: number) => {
    if (startX.current === null) return;
    deltaX.current = x - startX.current;
    setDrag(deltaX.current);
  };
  const onUp = () => {
    const w = trackRef.current?.clientWidth ?? 1;
    const threshold = Math.min(80, w * 0.15);
    if (deltaX.current > threshold) onPrev();
    else if (deltaX.current < -threshold) onNext();
    startX.current = null;
    deltaX.current = 0;
    setDragging(false);
    setDrag(0);
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-muted select-none",
        rounded && "rounded-2xl",
        full ? "h-full" : "aspect-[16/9]",
        className
      )}
      ref={trackRef}
      onTouchStart={(e) => onDown(e.touches[0].clientX)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={onUp}
      onMouseDown={(e) => {
        e.preventDefault();
        onDown(e.clientX);
      }}
      onMouseMove={(e) => dragging && onMove(e.clientX)}
      onMouseUp={onUp}
      onMouseLeave={() => dragging && onUp()}
    >
      <div
        className={cn(
          "flex h-full w-full",
          !dragging && "transition-transform duration-500 ease-out"
        )}
        style={{
          transform: `translate3d(calc(${-index * 100}% + ${drag}px), 0, 0)`,
        }}
      >
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-full w-full shrink-0 basis-full overflow-hidden"
            onClick={() => {
              if (Math.abs(deltaX.current) < 5) onOpen?.();
            }}
          >
            <img
              src={src}
              alt={`${alt} ${i + 1}`}
              loading="lazy"
              decoding="async"
              draggable={false}
              className={cn(
                "h-full w-full object-cover transition-transform duration-700 ease-out",
                i === index ? "scale-105" : "scale-100",
                onOpen && "cursor-zoom-in"
              )}
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="hidden md:grid absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 place-items-center rounded-full bg-background/80 backdrop-blur shadow-md hover:bg-background transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="hidden md:grid absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 place-items-center rounded-full bg-background/80 backdrop-blur shadow-md hover:bg-background transition"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to image ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(i);
                }}
                className={cn(
                  "h-1.5 rounded-full bg-white/60 transition-all duration-300 shadow",
                  i === index ? "w-6 bg-white" : "w-1.5 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Lightbox({
  images,
  alt,
  index,
  onChange,
  onNext,
  onPrev,
  onClose,
}: {
  images: string[];
  alt: string;
  index: number;
  onChange: (i: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onNext, onPrev]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 animate-fade-in flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition z-10"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="w-full h-full max-w-6xl px-2 sm:px-8 py-12">
        <SliderTrack
          images={images}
          alt={alt}
          index={index}
          onChange={onChange}
          onNext={onNext}
          onPrev={onPrev}
          full
          className="!bg-transparent [&_img]:object-contain"
        />
      </div>
    </div>
  );
}
