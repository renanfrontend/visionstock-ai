import { Package } from "lucide-react";

/** Product cover on a light card, so photos with white backgrounds read well in the dark UI. */
export function ProductThumb({ src, alt, className = "size-12" }: { src: string | null; alt: string; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f4f6fb] ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- stored data URL cover
        <img src={src} alt={alt} className="size-full object-cover" draggable={false} />
      ) : (
        <Package className="size-1/2 text-[#9aa7bd]" aria-label={alt} />
      )}
    </span>
  );
}
