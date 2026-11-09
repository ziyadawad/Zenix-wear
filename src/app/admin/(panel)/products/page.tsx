import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { getCategories, loadProducts } from '@/lib/catalog';
import { PageHead, Tabs, egp } from '@/components/admin/ui';
import { totalStock } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function Products({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  await requireAdmin();
  const { cat = 'all', q = '' } = await searchParams;
  const [all, categories] = await Promise.all([loadProducts('true'), getCategories()]);
  const needle = q.trim().toLowerCase();
  const list = all.filter((p) => (cat === 'all' || p.category === cat) && (!needle || p.nameEn.toLowerCase().includes(needle) || p.nameAr.includes(q) || p.sku.toLowerCase().includes(needle)));
  return (
    <>
      <PageHead title="Products" sub={`${all.length} total`} action={<Link href="/admin/products/new" className="btn btn-primary !min-h-11 !px-4"><Plus size={16} />Add product</Link>} />
      <Tabs active={cat} items={[{ key: 'all', href: '/admin/products', label: 'All', count: all.length }, ...categories.map((c) => ({ key: c.slug, href: `/admin/products?cat=${c.slug}`, label: c.nameEn, count: all.filter((p) => p.category === c.slug).length }))]} />
      <form className="mb-4"><input type="hidden" name="cat" value={cat} /><input name="q" defaultValue={q} className="field" placeholder="Search name or SKU" aria-label="Search products" /></form>
      <ul className="divide-y divide-line border border-line bg-surface">
        {list.map((p) => {
          const stock = totalStock(p);
          return (
            <li key={p.id}>
              <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 p-2.5 hover:bg-raised">
                <span className="relative h-16 w-[52px] flex-none bg-raised">{p.colors[0]?.images[0] && <Image src={p.colors[0].images[0]} alt="" fill sizes="52px" quality={70} className="object-cover" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{p.nameEn}</span>
                  <span className="block truncate text-xs text-muted">{p.sku} · {p.colors.length} colours{p.status === 'draft' ? ' · Draft' : ''}</span>
                </span>
                <span className="flex-none text-end text-sm">
                  {p.salePrice != null ? <><span className="block">{egp(p.salePrice)}</span><s className="block text-xs text-muted">{egp(p.price)}</s></> : <span className="block">{egp(p.price)}</span>}
                  <span className={`block text-xs ${stock === 0 ? 'text-[#ff9a9d]' : 'text-muted'}`}>{stock} in stock</span>
                </span>
              </Link>
            </li>
          );
        })}
        {list.length === 0 && <li className="p-8 text-center text-sm text-muted">No products found.</li>}
      </ul>
    </>
  );
}
