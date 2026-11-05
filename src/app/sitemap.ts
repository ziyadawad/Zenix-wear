import type { MetadataRoute } from 'next';
import { getCatalog, getCollections } from '@/lib/catalog';
import { CATEGORIES } from '@/lib/types';
import { SITE_URL } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections] = await Promise.all([getCatalog(), getCollections()]);
  const entry = (path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}/ar${path}`, priority, lastModified,
    alternates: { languages: { ar: `${SITE_URL}/ar${path}`, en: `${SITE_URL}/en${path}` } },
  });
  return [
    entry('', 1),
    ...['/shop', '/new-drops', '/collections'].map((p) => entry(p, 0.9)),
    ...CATEGORIES.map((c) => entry(`/shop/${c}`, 0.9)),
    ...collections.map((c) => entry(`/collections/${c.slug}`, 0.7)),
    ...products.map((p) => entry(`/product/${p.slug}`, 0.8, p.createdAt)),
    ...['/about', '/contact', '/faq', '/track-order', '/shipping-policy', '/exchange-policy', '/privacy', '/terms'].map((p) => entry(p, 0.4)),
  ];
}
