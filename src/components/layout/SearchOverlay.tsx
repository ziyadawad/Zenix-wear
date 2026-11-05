'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useI18n } from './I18nProvider';
import { searchUi } from '@/lib/client/store';
import { searchProducts, type SearchHit } from '@/app/actions/shop';
import { formatMoney } from '@/lib/utils';

export function SearchOverlay() {
  const { t, lp, locale } = useI18n();
  const open = searchUi.use();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const close = () => searchUi.set(false);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', esc);
    document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.documentElement.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const id = setTimeout(async () => {
      const r = await searchProducts(q);
      if (live) setHits(r);
    }, q ? 180 : 0);
    return () => { live = false; clearTimeout(id); };
  }, [q, open]);

  if (!open) return null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { close(); router.push(lp(`/search?q=${encodeURIComponent(q.trim())}`)); }
  };
  return (
    <div role="dialog" aria-modal="true" aria-label={t.search.title} className="fixed inset-0 z-[70] overflow-y-auto bg-black/98" style={{ animation: 'fadeIn .25s ease both' }}>
      <div className="container-zx pb-24 pt-3 md:pt-8">
        <form onSubmit={submit} role="search" className="flex items-center gap-3 border-b border-line-strong">
          <Search size={20} strokeWidth={1.25} className="flex-none text-muted" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} type="search" enterKeyHint="search" placeholder={t.search.placeholder} aria-label={t.search.title} className="h-16 w-full bg-transparent text-lg outline-none placeholder:text-[#7a7a7a] md:text-2xl" />
          <button type="button" className="icon-btn -me-3 flex-none" aria-label={t.nav.close} onClick={close}><X size={22} strokeWidth={1.25} /></button>
        </form>
        <p className="eyebrow mt-8 mb-5">{q ? (hits?.length ? `${hits.length} ${t.search.results} “${q}”` : hits ? `${t.search.none} “${q}”` : t.common.loading) : t.search.popular}</p>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {hits?.map((h) => (
            <li key={h.slug}>
              <Link href={lp(`/product/${h.slug}`)} onClick={close} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-surface"><Image src={h.image} alt={locale === 'ar' ? h.nameAr : h.nameEn} fill sizes="(min-width:1024px) 16vw, 50vw" quality={70} className="zoom-img object-cover" /></div>
                <p className="mt-2 text-[13px]">{locale === 'ar' ? h.nameAr : h.nameEn}</p>
                <p className="text-[13px] text-muted">{formatMoney(h.price, locale)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
