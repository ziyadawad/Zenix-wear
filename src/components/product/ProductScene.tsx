'use client';
import { useState } from 'react';
import Image from 'next/image';
import { DEFAULT_NEON } from '../../../config/scene.config';
import { displayImage, sceneInfo } from '@/lib/db/images';
import { cx } from '@/lib/utils';

/**
 * A product image in its "ambient light" studio scene. Fills its parent (give the parent the aspect ratio, 4:5).
 *
 * - Shipped images are pre-rendered scenes (src/lib/scene/compose.ts: haze, neon beam, garment, rim light,
 *   wet floor, logo), shown whole. The owner's own photos get the same studio built in CSS around them.
 * - On top: a neon glow in the scene's colour that grows slowly on hover (desktop, not with reduced motion).
 * - When `src` changes (a colour swatch), the new scene fades in over the old one once it has loaded,
 *   and the glow colour moves to the new neon.
 */
export function ProductScene({ src, alt, sizes, priority = false, quality = 70, className }: {
  src?: string | null; alt: string; sizes: string; priority?: boolean; quality?: number; className?: string;
}) {
  const current = displayImage(src);
  const [layers, setLayers] = useState([{ src: current, on: true }]);
  // A new image joins on top, invisible until it has loaded (adjusting state while rendering, not in an effect).
  if (layers[layers.length - 1].src !== current) setLayers((l) => [...l.filter((x) => x.on && x.src !== current).slice(-1), { src: current, on: false }]);
  const info = sceneInfo(current);
  const neon = info?.neon ?? DEFAULT_NEON;
  const show = (s: string) => setLayers((l) => l.map((x) => (x.src === s ? { ...x, on: true } : x)));
  const settle = (s: string) => setLayers((l) => { const i = l.findIndex((x) => x.src === s); return i > 0 && l[i].on ? l.slice(i) : l; });

  return (
    <div className={cx('pscene absolute inset-0 overflow-hidden', className)} style={{ '--neon': neon } as React.CSSProperties}>
      {!info && <div className="pscene-stage absolute inset-0" aria-hidden="true" />}
      {layers.map((l, i) => {
        const own = !sceneInfo(l.src);
        return (
          <div key={l.src} className={cx('pscene-layer absolute inset-0', l.on && 'on')} onTransitionEnd={(e) => { if (e.target === e.currentTarget) settle(l.src); }}>
            <Image
              src={l.src} alt={i === layers.length - 1 ? alt : ''} fill sizes={sizes} quality={quality}
              preload={priority && i === 0} fetchPriority={priority ? 'high' : 'auto'} loading={priority ? 'eager' : 'lazy'}
              onLoad={() => show(l.src)}
              className={own ? 'object-contain p-[6%]' : 'object-cover'}
            />
          </div>
        );
      })}
      <div className="pscene-glow pointer-events-none absolute inset-0" aria-hidden="true" />
    </div>
  );
}
