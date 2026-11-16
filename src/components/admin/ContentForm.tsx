'use client';
import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { saveContent } from '@/app/admin/actions';
import type { HeroSlide, SiteContent } from '@/lib/types';
import { ImagePicker } from './ImagePicker';
import { Card } from './ui';
import { cx } from '@/lib/utils';


export function ContentForm({ initial, products }: { initial: SiteContent; products: { id: string; name: string }[] }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const up = (patch: Partial<SiteContent>) => { setV((s) => ({ ...s, ...patch })); setMsg(null); };
  const upSlide = (i: number, patch: Partial<HeroSlide>) => up({ hero: v.hero.map((s, x) => (x === i ? { ...s, ...patch } : s)) });

  return (
    <form className="max-w-[1000px] space-y-4 pb-20" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveContent(v); setMsg(r.ok ? { ok: true, text: 'Saved' } : { ok: false, text: r.error ?? 'Could not save.' }); }); }}>
      <Card title="Hero slides">
        <div className="space-y-4">
          {v.hero.map((s, i) => (
            <div key={s.id} className="space-y-3 border border-line p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm">Slide {i + 1}</p>
                <button type="button" disabled={v.hero.length === 1} className="inline-flex min-h-11 items-center gap-1.5 text-xs text-[#ff9a9d] disabled:opacity-30" onClick={() => up({ hero: v.hero.filter((_, j) => j !== i) })}><Trash2 size={14} strokeWidth={1.25} />Remove</button>
              </div>
              <div className="max-w-[200px]"><p className="label">Photo</p><ImagePicker max={1} label="Upload" images={s.image ? [s.image] : []} onChange={(a) => upSlide(i, { image: a[0] ?? '', kind: a[0] && a[0] !== s.image ? 'cover' : s.kind })} /></div>
              <div><label className="label" htmlFor={`h-v-${i}`}>Video link instead of photo (optional, .mp4)</label><input id={`h-v-${i}`} type="url" className="field" placeholder="https://" value={s.video ?? ''} onChange={(e) => upSlide(i, { video: e.target.value || undefined })} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label" htmlFor={`h-se-${i}`}>Sub-line (EN)</label><input id={`h-se-${i}`} className="field" value={s.subEn} onChange={(e) => upSlide(i, { subEn: e.target.value })} /></div>
                <div><label className="label" htmlFor={`h-sa-${i}`}>Sub-line (AR)</label><input id={`h-sa-${i}`} dir="rtl" className="field" value={s.subAr} onChange={(e) => upSlide(i, { subAr: e.target.value })} /></div>
              </div>
            </div>
          ))}
          {v.hero.length < 6 && <button type="button" className="btn btn-ghost !min-h-11 w-full" onClick={() => up({ hero: [...v.hero, { id: crypto.randomUUID(), kind: 'cover', image: '', headlineAr: 'ZENIX WEAR', headlineEn: 'ZENIX WEAR', subAr: '', subEn: '' }] })}><Plus size={15} />Add slide</button>}
        </div>
      </Card>

      <Card title="Shop page banner">
        <p className="mb-3 text-xs text-muted">Category tile photos are set per category, under Categories.</p>
        <div className="max-w-[240px]"><ImagePicker max={1} label="Upload" images={v.shopImage ? [v.shopImage] : []} onChange={(a) => up({ shopImage: a[0] ?? '' })} /></div>
      </Card>

      <Card title="Product order on the homepage">
        <p className="mb-3 text-xs text-muted">Pick up to 8 to show first. Leave empty and the site shows your real best sellers automatically.</p>
        <div className="flex max-h-[280px] flex-wrap gap-1.5 overflow-y-auto">
          {products.map((p) => {
            const on = v.bestSellerIds.includes(p.id);
            return <button key={p.id} type="button" aria-pressed={on} onClick={() => up({ bestSellerIds: on ? v.bestSellerIds.filter((x) => x !== p.id) : [...v.bestSellerIds, p.id].slice(0, 8) })} className={cx('min-h-11 border px-3 text-xs', on ? 'border-white bg-white text-black' : 'border-line-strong')}>{p.name}</button>;
          })}
        </div>
      </Card>

      <Card title="#ZENIXWEAR gallery"><ImagePicker max={6} images={v.community} onChange={(community) => up({ community })} /></Card>

      <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 flex items-center justify-end gap-3 border-t border-line bg-black/95 p-2.5 lg:bottom-0 lg:start-[230px]">
        {msg && <p role="status" className={msg.ok ? 'text-sm text-success' : 'min-w-0 truncate text-sm text-[#ff9a9d]'}>{msg.text}</p>}
        <button className="btn btn-primary !min-h-11" disabled={pending}>{pending ? 'Saving…' : 'Save homepage'}</button>
      </div>
    </form>
  );
}
