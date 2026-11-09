import type { MetadataRoute } from 'next';
import { getCatalog, getCategories } from '@/lib/catalog';
import { SITE_URL } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getCatalog(), getCategories()]);
  const entry = (path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}/ar${path}`, priority, lastModified,
    alternates: { languages: { ar: `${SITE_URL}/ar${path}`, en: `${SITE_URL}/en${path}` } },
  });
  return [
    entry('', 1),
    entry('/shop', 0.9),
    ...categories.map((c) => entry(`/shop/${c.slug}`, 0.9)),
    ...products.map((p) => entry(`/product/${p.slug}`, 0.8, p.createdAt)),
    ...['/about', '/contact', '/faq', '/track-order', '/shipping-policy', '/exchange-policy', '/privacy', '/terms'].map((p) => entry(p, 0.4)),
  ];
}
