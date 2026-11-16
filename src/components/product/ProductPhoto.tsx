'use client';
import { useState } from 'react';
import Image from 'next/image';
import { displayImage } from '@/lib/db/images';
import { cx } from '@/lib/utils';

/**
 * A product photo on the same black background as the photos. Fills its parent (give the parent the 4:5
 * ratio) and is always shown whole (contain). No tint or overlay: the garment keeps its true colour.
 * When `src` changes (a colour swatch, or front → back on hover), the new photo fades in over the old one
 * once it has loaded.
 */
export function ProductPhoto({ src, alt, sizes, priority = false, quality = 80, className }: {
  src?: string | null; alt: string; sizes: string; priority?: boolean; quality?: number; className?: string;
}) {
  const current = displayImage(src);
  const [layers, setLayers] = useState([{ src: current, on: true }]);
  // A new photo joins on top, invisible until it has loaded (adjusting state while rendering, not in an effect).
  if (layers[layers.length - 1].src !== current) setLayers((l) => [...l.filter((x) => x.on && x.src !== current).slice(-1), { src: current, on: false }]);
  const show = (s: string) => setLayers((l) => l.map((x) => (x.src === s ? { ...x, on: true } : x)));
  const settle = (s: string) => setLayers((l) => { const i = l.findIndex((x) => x.src === s); return i > 0 && l[i].on ? l.slice(i) : l; });

  return (
    <div className={cx('pphoto absolute inset-0 overflow-hidden', className)}>
      {layers.map((l, i) => (
        <div key={l.src} className={cx('pphoto-layer absolute inset-0', l.on && 'on')} onTransitionEnd={(e) => { if (e.target === e.currentTarget) settle(l.src); }}>
          <Image
            src={l.src} alt={i === layers.length - 1 ? alt : ''} fill sizes={sizes} quality={quality}
            preload={priority && i === 0} fetchPriority={priority ? 'high' : 'auto'} loading={priority ? 'eager' : 'lazy'}
            onLoad={() => show(l.src)} className="object-contain"
          />
        </div>
      ))}
    </div>
  );
}
