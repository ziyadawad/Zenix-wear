import Image from 'next/image';
import Link from 'next/link';
import { cx } from '@/lib/utils';

export function Marquee({ words }: { words: string[] }) {
  const row = Array.from({ length: 6 }).flatMap(() => words);
  return (
    <div className="overflow-hidden border-y border-line bg-black py-4 md:py-5" aria-hidden="true" dir="ltr">
      <div className="marquee" style={{ animationName: 'marquee' }}>
        {[...row, ...row].map((w, i) => (
          <span key={i} className="latin-wide flex flex-none items-center whitespace-nowrap text-[11px] text-silver md:text-[13px]">
            <span className="px-5 md:px-8">{w}</span><span className="text-muted">—</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function SectionHead({ id, title, link, center, withArrowSpace }: { id: string; title: string; link?: { href: string; label: string }; center?: boolean; withArrowSpace?: boolean }) {
  return (
    <div className={cx('mb-8 flex items-end gap-6 md:mb-12', center ? 'justify-center text-center' : 'justify-between', withArrowSpace && 'md:pe-[110px]')}>
      <h2 id={id} className="display h-section" data-reveal>{title}</h2>
      {link && <Link href={link.href} className="link-underline flex-none text-[13px] text-silver">{link.label}</Link>}
    </div>
  );
}

/** The attached logo, split into the Z and its ring so they can move separately. Geometry is untouched. */
export function OrbitMark({ className }: { className?: string }) {
  return (
    <div className={cx('relative', className)} style={{ perspective: 900 }} dir="ltr">
      <Image src="/brand/z-ring.webp" alt="" width={694} height={427} loading="lazy" className="orbit-ring absolute inset-0 h-auto w-full" />
      <Image src="/brand/z-only.webp" alt="ZENIX" width={694} height={427} loading="lazy" className="orbit-z relative h-auto w-full" />
    </div>
  );
}
