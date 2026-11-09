'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteCategory, saveCategory, type CategoryInput } from '@/app/admin/actions';
import type { Category } from '@/lib/types';
import { ImagePicker } from './ImagePicker';

/** Add or edit one category. A new category appears in the menu, the shop tabs and the product form. */
export function CategoryForm({ category, count }: { category: Category | null; count?: number }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [v, setV] = useState<CategoryInput>(() => ({
    originalSlug: category?.slug ?? null, slug: category?.slug ?? '', nameAr: category?.nameAr ?? '', nameEn: category?.nameEn ?? '',
    blurbAr: category?.blurbAr ?? '', blurbEn: category?.blurbEn ?? '', image: category?.image ?? '', sort: category?.sort ?? 10, inMenu: category?.inMenu ?? true,
  }));
  const up = (patch: Partial<CategoryInput>) => setV((x) => ({ ...x, ...patch }));
  const id = category?.slug ?? 'new';

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveCategory(v);
      setMsg(r.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: r.error ?? 'Could not save.' });
      if (r.ok) { if (!category) setV((x) => ({ ...x, slug: '', nameAr: '', nameEn: '', blurbAr: '', blurbEn: '', image: '' })); router.refresh(); }
    });
  };
  const remove = () => {
    if (!category || !confirm(`Delete the category "${category.nameEn}"?`)) return;
    start(async () => {
      const r = await deleteCategory(category.slug);
      if (r.ok) router.refresh(); else setMsg({ ok: false, text: r.error ?? 'Could not delete.' });
    });
  };

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-[160px_1fr]">
      <div><p className="label">Tile photo</p><ImagePicker max={1} label="Upload" images={v.image ? [v.image] : []} onChange={(a) => up({ image: a[0] ?? '' })} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor={`${id}-ar`}>Name (Arabic)</label><input id={`${id}-ar`} className="field" dir="rtl" value={v.nameAr} onChange={(e) => up({ nameAr: e.target.value })} required maxLength={80} /></div>
        <div><label className="label" htmlFor={`${id}-en`}>Name (English)</label><input id={`${id}-en`} className="field" value={v.nameEn} onChange={(e) => up({ nameEn: e.target.value })} required maxLength={80} /></div>
        <div><label className="label" htmlFor={`${id}-bar`}>Short line (Arabic)</label><input id={`${id}-bar`} className="field" dir="rtl" value={v.blurbAr} onChange={(e) => up({ blurbAr: e.target.value })} maxLength={240} /></div>
        <div><label className="label" htmlFor={`${id}-ben`}>Short line (English)</label><input id={`${id}-ben`} className="field" value={v.blurbEn} onChange={(e) => up({ blurbEn: e.target.value })} maxLength={240} /></div>
        <div><label className="label" htmlFor={`${id}-slug`}>URL</label><input id={`${id}-slug`} className="field" dir="ltr" placeholder="made from the English name" value={v.slug} onChange={(e) => up({ slug: e.target.value })} maxLength={60} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor={`${id}-sort`}>Order</label><input id={`${id}-sort`} type="number" min={0} max={999} className="field" value={v.sort} onChange={(e) => up({ sort: Number(e.target.value) || 0 })} /></div>
          <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" className="size-4 accent-white" checked={v.inMenu} onChange={(e) => up({ inMenu: e.target.checked })} />In the menu</label>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button className="btn btn-primary !min-h-11 !px-5" disabled={busy}>{busy ? 'Saving…' : category ? 'Save' : 'Add category'}</button>
          {category && <button type="button" onClick={remove} disabled={busy || (count ?? 0) > 0} title={(count ?? 0) > 0 ? 'Only an empty category can be deleted' : undefined} className="btn btn-ghost !min-h-11 !px-4 disabled:opacity-40"><Trash2 size={15} />Delete</button>}
          {category && <span className="text-xs text-muted">{count ?? 0} product(s) · /shop/{category.slug}</span>}
          {msg && <span className={`text-sm ${msg.ok ? 'text-[#6fd3a0]' : 'text-[#ff9a9d]'}`} role="status">{msg.text}</span>}
        </div>
      </div>
    </form>
  );
}
