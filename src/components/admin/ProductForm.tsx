'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { ImagePicker } from './ImagePicker';
import { saveProduct, type ProductInput } from '@/app/admin/actions';
import { CATEGORIES, FITS, SIZES, TAGS, type Collection, type Product } from '@/lib/types';
import { cx, slugify } from '@/lib/utils';

type ColorDraft = ProductInput['colors'][number];
const blankColor = (): ColorDraft => ({ id: '', nameAr: '', nameEn: '', hex: '#0d0d0d', images: [], stock: {} });

function fromProduct(p: Product | null): ProductInput {
  if (!p) {
    return {
      id: null, slug: '', sku: '', nameAr: '', nameEn: '', descAr: '', descEn: '', fabricAr: '', fabricEn: '', careAr: '', careEn: '', fitAr: '', fitEn: '',
      price: 0, salePrice: null, category: 't-shirts', fit: 'regular', gender: 'men', collection: null, tags: [], status: 'active', featured: false, video: null,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: [blankColor()],
    };
  }
  const order = SIZES as readonly string[];
  return {
    id: p.id, slug: p.slug, sku: p.sku, nameAr: p.nameAr, nameEn: p.nameEn, descAr: p.descAr, descEn: p.descEn, fabricAr: p.fabricAr, fabricEn: p.fabricEn, careAr: p.careAr, careEn: p.careEn, fitAr: p.fitAr, fitEn: p.fitEn,
    price: p.price, salePrice: p.salePrice, category: p.category, fit: p.fit as ProductInput['fit'], gender: p.gender as ProductInput['gender'], collection: p.collection, tags: p.tags, status: p.status, featured: p.featured, video: p.video,
    sizes: [...new Set(p.variants.map((v) => v.size))].sort((a, b) => order.indexOf(a) - order.indexOf(b)) as ProductInput['sizes'],
    colors: p.colors.map((c) => ({ ...c, stock: Object.fromEntries(p.variants.filter((v) => v.colorId === c.id).map((v) => [v.size, v.stock])) })),
  };
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-4 border border-line bg-surface p-4 md:p-5"><h2 className="eyebrow">{title}</h2>{children}</section>
);

export function ProductForm({ product, collections }: { product: Product | null; collections: Collection[] }) {
  const router = useRouter();
  const [v, setV] = useState<ProductInput>(() => fromProduct(product));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const up = <K extends keyof ProductInput>(k: K, val: ProductInput[K]) => { setV((s) => ({ ...s, [k]: val })); setSaved(false); };
  const upColor = (i: number, patch: Partial<ColorDraft>) => { setV((s) => ({ ...s, colors: s.colors.map((c, x) => (x === i ? { ...c, ...patch } : c)) })); setSaved(false); };

  const text = (k: 'nameEn' | 'nameAr' | 'sku' | 'slug', label: string, attrs: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="label" htmlFor={`p-${k}`}>{label}</label><input id={`p-${k}`} className="field" value={v[k]} onChange={(e) => up(k, e.target.value)} {...attrs} /></div>
  );
  const area = (k: 'descEn' | 'descAr' | 'fabricEn' | 'fabricAr' | 'careEn' | 'careAr' | 'fitEn' | 'fitAr', label: string) => (
    <div><label className="label" htmlFor={`p-${k}`}>{label}</label><textarea id={`p-${k}`} dir={k.endsWith('Ar') ? 'rtl' : 'ltr'} className="field min-h-[96px]" value={v[k]} onChange={(e) => up(k, e.target.value)} /></div>
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // A colour's stable id comes from its English name the first time it is saved.
    const colors = v.colors.map((c) => ({ ...c, id: c.id || slugify(c.nameEn) }));
    start(async () => {
      const r = await saveProduct({ ...v, colors });
      if (!r.ok) { setError(r.error ?? 'Could not save.'); return; }
      setSaved(true);
      if (!product) router.push(`/admin/products/${r.id}`);
      else router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 pb-20 xl:grid-cols-[1.5fr_1fr]">
      <div className="min-w-0 space-y-4">
        <Section title="Name & description">
          <div className="grid gap-4 sm:grid-cols-2">
            {text('nameEn', 'Name (English)', { required: true })}
            {text('nameAr', 'Name (Arabic)', { required: true, dir: 'rtl' })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{area('descEn', 'Description (English)')}{area('descAr', 'Description (Arabic)')}</div>
        </Section>

        <Section title="Colours, photos & stock">
          <fieldset>
            <legend className="label">Sizes this product comes in</legend>
            <div className="flex flex-wrap gap-1.5">
              {SIZES.map((s) => {
                const on = v.sizes.includes(s);
                return <button key={s} type="button" aria-pressed={on} onClick={() => up('sizes', on ? v.sizes.filter((x) => x !== s) : SIZES.filter((x) => v.sizes.includes(x) || x === s))} className={cx('h-11 min-w-11 border px-2 text-xs', on ? 'border-white bg-white text-black' : 'border-line-strong')}>{s === 'ONE' ? 'One size' : s}</button>;
              })}
            </div>
          </fieldset>
          {v.colors.map((c, i) => (
            <div key={i} className="space-y-3 border border-line p-3">
              <div className="grid grid-cols-[52px_1fr_1fr_auto] items-end gap-2">
                <div><label className="label" htmlFor={`c-h-${i}`}>Swatch</label><input id={`c-h-${i}`} type="color" value={c.hex} onChange={(e) => upColor(i, { hex: e.target.value })} className="h-[50px] w-full cursor-pointer border border-line bg-transparent p-1" /></div>
                <div><label className="label" htmlFor={`c-e-${i}`}>Colour (EN)</label><input id={`c-e-${i}`} className="field" required value={c.nameEn} onChange={(e) => upColor(i, { nameEn: e.target.value })} /></div>
                <div><label className="label" htmlFor={`c-a-${i}`}>Colour (AR)</label><input id={`c-a-${i}`} className="field" required dir="rtl" value={c.nameAr} onChange={(e) => upColor(i, { nameAr: e.target.value })} /></div>
                <button type="button" aria-label={`Remove colour ${c.nameEn}`} disabled={v.colors.length === 1} onClick={() => up('colors', v.colors.filter((_, x) => x !== i))} className="flex size-[50px] items-center justify-center text-muted hover:text-[#ff9a9d] disabled:opacity-30"><Trash2 size={17} strokeWidth={1.25} /></button>
              </div>
              <div><p className="label">Photos (first one is the main photo)</p><ImagePicker images={c.images} onChange={(images) => upColor(i, { images })} /></div>
              <div>
                <p className="label">Stock per size</p>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                  {v.sizes.map((s) => (
                    <label key={s} className="text-center text-xs text-muted">
                      {s === 'ONE' ? 'One size' : s}
                      <input type="number" inputMode="numeric" min={0} className="field mt-1 !min-h-11 !p-1 text-center" value={c.stock[s] ?? 0} onChange={(e) => upColor(i, { stock: { ...c.stock, [s]: Math.max(0, Number(e.target.value) || 0) } })} />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost !min-h-11 w-full" onClick={() => up('colors', [...v.colors, blankColor()])}><Plus size={15} />Add colour</button>
        </Section>

        <Section title="Fabric, care & fit">
          <div className="grid gap-4 sm:grid-cols-2">{area('fabricEn', 'Fabric (English)')}{area('fabricAr', 'Fabric (Arabic)')}{area('careEn', 'Care (English)')}{area('careAr', 'Care (Arabic)')}{area('fitEn', 'Fit tip (English)')}{area('fitAr', 'Fit tip (Arabic)')}</div>
        </Section>
      </div>

      <div className="min-w-0 space-y-4">
        <Section title="Price">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="p-price">Price (EGP)</label><input id="p-price" type="number" inputMode="numeric" required min={1} className="field" value={v.price || ''} onChange={(e) => up('price', Number(e.target.value) || 0)} /></div>
            <div><label className="label" htmlFor="p-sale">Sale price (optional)</label><input id="p-sale" type="number" inputMode="numeric" min={0} className="field" value={v.salePrice ?? ''} onChange={(e) => up('salePrice', e.target.value === '' ? null : Number(e.target.value))} /></div>
          </div>
        </Section>
        <Section title="Organise">
          <div><label className="label" htmlFor="p-status">Visibility</label><select id="p-status" className="field" value={v.status} onChange={(e) => up('status', e.target.value as ProductInput['status'])}><option value="active">Live on the site</option><option value="draft">Draft (hidden)</option></select></div>
          <div><label className="label" htmlFor="p-cat">Category</label><select id="p-cat" className="field capitalize" value={v.category} onChange={(e) => up('category', e.target.value as ProductInput['category'])}>{CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('-', ' ')}</option>)}</select></div>
          {v.category === 't-shirts' && <div><label className="label" htmlFor="p-fit">Fit</label><select id="p-fit" className="field capitalize" value={v.fit ?? ''} onChange={(e) => up('fit', (e.target.value || null) as ProductInput['fit'])}><option value="">None</option>{FITS.map((f) => <option key={f}>{f}</option>)}</select></div>}
          <div><label className="label" htmlFor="p-col">Collection</label><select id="p-col" className="field" value={v.collection ?? ''} onChange={(e) => up('collection', e.target.value || null)}><option value="">None</option>{collections.map((c) => <option key={c.slug} value={c.slug}>{c.nameEn}</option>)}</select></div>
          <fieldset>
            <legend className="label">Tags</legend>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((tag) => { const on = v.tags.includes(tag); return <button key={tag} type="button" aria-pressed={on} onClick={() => up('tags', on ? v.tags.filter((x) => x !== tag) : [...v.tags, tag])} className={cx('min-h-11 border px-3 text-xs capitalize', on ? 'border-white bg-white text-black' : 'border-line-strong')}>{tag.replace('-', ' ')}</button>; })}
            </div>
          </fieldset>
        </Section>
        <Section title="Details">
          {text('sku', 'SKU', { required: true })}
          {text('slug', 'URL (leave empty to generate)', { placeholder: slugify(v.nameEn) })}
          <div><label className="label" htmlFor="p-video">Video link (optional)</label><input id="p-video" type="url" className="field" placeholder="https://" value={v.video ?? ''} onChange={(e) => up('video', e.target.value || null)} /></div>
        </Section>
      </div>

      <div className="no-print fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-line bg-black/95 p-2.5 backdrop-blur lg:bottom-0 lg:start-[230px]">
        <div className="min-w-0 flex-1 text-sm">
          {error && <p className="line-clamp-2 text-[#ff9a9d]" role="alert">{error}</p>}
          {saved && !error && <p className="text-success" role="status">Saved</p>}
        </div>
        <Link href="/admin/products" className="btn btn-ghost !min-h-11 !px-4">Back</Link>
        <button className="btn btn-primary !min-h-11 !px-6" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
