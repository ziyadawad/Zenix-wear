import type { Queryable } from './index';
import type { ProductColor, SiteContent, SiteSettings } from '../types';

import { DEFAULT_COMMUNITY, SCENES, mockupsFor } from './images';

/** Governorate id, Arabic, English, placeholder fee (editable in admin > Shipping). */
export const GOVERNORATES: [string, string, string, number][] = [
  ['cairo', 'القاهرة', 'Cairo', 60], ['giza', 'الجيزة', 'Giza', 60], ['alexandria', 'الإسكندرية', 'Alexandria', 70],
  ['qalyubia', 'القليوبية', 'Qalyubia', 65], ['dakahlia', 'الدقهلية', 'Dakahlia', 75], ['sharqia', 'الشرقية', 'Sharqia', 75],
  ['gharbia', 'الغربية', 'Gharbia', 75], ['monufia', 'المنوفية', 'Monufia', 75], ['beheira', 'البحيرة', 'Beheira', 75],
  ['kafr-el-sheikh', 'كفر الشيخ', 'Kafr El Sheikh', 80], ['damietta', 'دمياط', 'Damietta', 80], ['port-said', 'بورسعيد', 'Port Said', 80],
  ['ismailia', 'الإسماعيلية', 'Ismailia', 80], ['suez', 'السويس', 'Suez', 80], ['faiyum', 'الفيوم', 'Faiyum', 85],
  ['beni-suef', 'بني سويف', 'Beni Suef', 85], ['minya', 'المنيا', 'Minya', 90], ['asyut', 'أسيوط', 'Asyut', 95],
  ['sohag', 'سوهاج', 'Sohag', 95], ['qena', 'قنا', 'Qena', 100], ['luxor', 'الأقصر', 'Luxor', 100],
  ['aswan', 'أسوان', 'Aswan', 110], ['red-sea', 'البحر الأحمر', 'Red Sea', 110], ['new-valley', 'الوادي الجديد', 'New Valley', 120],
  ['matruh', 'مطروح', 'Matruh', 110], ['north-sinai', 'شمال سيناء', 'North Sinai', 120], ['south-sinai', 'جنوب سيناء', 'South Sinai', 120],
];

const COLOR: Record<string, [string, string, string]> = {
  black: ['أسود', 'Black', '#0d0d0d'], white: ['أبيض', 'White', '#f4f4f4'], gray: ['رمادي', 'Gray', '#85878d'],
};

/** "tee-a:black" = mockup type and colour. Front and back. */
function color(spec: string): ProductColor {
  const [type, id] = spec.split(':');
  const [nameAr, nameEn, hex] = COLOR[id];
  return { id, nameAr, nameEn, hex, images: mockupsFor(type, id, hex) };
}

const FABRIC = {
  ar: '١٠٠٪ قطن مصري ٢٠٠ جرام. ناعم، بيهوّي، ومبيكشّش في الغسيل.',
  en: '100% Egyptian cotton, 200 GSM. Soft, breathable and pre-shrunk.',
};
const CARE = {
  ar: 'اغسله في الغسالة على مية باردة مع ألوان شبهه. من غير كلور. انشره في الضل واكويه على حرارة هادية.',
  en: 'Machine wash cold with like colours. Do not bleach. Dry in the shade and iron on low.',
};
const FIT = { ar: 'قصّة عادية ومريحة. خد مقاسك العادي.', en: 'Regular, comfortable fit. Take your usual size.' };

/** The store's categories. More can be added from Admin → Categories. */
export const STARTER_CATEGORIES = [
  { slug: 't-shirts', nameAr: 'تيشيرت نص كم', nameEn: 'Short-Sleeve T-Shirt', blurbAr: 'التيشيرت الأساسي: قطن تقيل وقصّة نضيفة تنفع لكل يوم.', blurbEn: 'The essential tee: heavy cotton and a clean cut for every day.', image: SCENES.tees, sort: 1 },
  { slug: 'sleeveless', nameAr: 'تيشيرت كت', nameEn: 'Sleeveless T-Shirt', blurbAr: 'من غير كم، للتمرين والحر. حركة براحتك.', blurbEn: 'No sleeves, for training and hot days. Move freely.', image: SCENES.sleeveless, sort: 2 },
];

export const SIZES_STARTER = ['S', 'M', 'L', 'XL', 'XXL'];
export const STARTER_PRODUCTS = [
  {
    slug: 'regular-tee', sku: 'ZX-001', ar: 'تيشيرت نص كم', en: 'Short-Sleeve T-Shirt', category: 't-shirts', price: 650,
    da: 'تيشيرت نص كم بقصّة عادية مريحة، قطن تقيل وخياطة متينة. بسيط ويتلبس مع أي حاجة.',
    de: 'A short-sleeve tee in a regular, comfortable fit, with heavy cotton and strong seams. Simple and easy to wear with anything.',
    colors: ['tee-a:black', 'tee-a:white', 'tee-a:gray'],
  },
  {
    slug: 'sleeveless-tee', sku: 'ZX-002', ar: 'تيشيرت كت', en: 'Sleeveless T-Shirt', category: 'sleeveless', price: 550,
    da: 'تيشيرت من غير كم، فتحة دراع مريحة وقماش خفيف. مثالي للجيم والجو الحر.',
    de: 'A sleeveless tee with comfortable armholes and light fabric. Made for the gym and hot days.',
    colors: ['tank:black', 'tank:white', 'tank:gray'],
  },
];

/** Inserts the starter categories and the two products, with stock for every size and colour. Skips what already exists. */
export async function insertStarterCatalogue(q: Queryable) {
  for (const c of STARTER_CATEGORIES) {
    await q.query(`INSERT INTO categories (slug,name_ar,name_en,blurb_ar,blurb_en,image,sort) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (slug) DO NOTHING`,
      [c.slug, c.nameAr, c.nameEn, c.blurbAr, c.blurbEn, c.image, c.sort]);
  }
  for (const p of STARTER_PRODUCTS) {
    const colors = p.colors.map(color);
    const added = await q.query(
      `INSERT INTO products (id,slug,sku,name_ar,name_en,desc_ar,desc_en,fabric_ar,fabric_en,care_ar,care_en,fit_ar,fit_en,price,category,fit,gender,tags,colors,featured)
       VALUES ($1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'regular','men','["new"]'::jsonb,$15::jsonb,true) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [p.slug, p.sku, p.ar, p.en, p.da, p.de, FABRIC.ar, FABRIC.en, CARE.ar, CARE.en, FIT.ar, FIT.en, p.price, p.category, JSON.stringify(colors)],
    );
    if (!added.length) continue;
    // Starter stock: 10 of each. Set the real numbers from the dashboard (Stock) or the admin.
    for (const c of colors) for (const size of SIZES_STARTER) {
      await q.query('INSERT INTO product_variants (product_id,color_id,size,stock) VALUES ($1,$2,$3,10) ON CONFLICT DO NOTHING', [p.slug, c.id, size]);
    }
  }
}

export const DEFAULT_CONTENT: SiteContent = {
  hero: [
    { id: 'h1', kind: 'brand', image: '', headlineAr: 'دماغ هادية، وأداء في القمة', headlineEn: 'Calm Mind. Peak Performance.', subAr: 'لبس رياضي فاخر متصمم في مصر، لكل واحد بيتمرن بتركيز.', subEn: 'Premium sportswear designed in Egypt, for those who train with focus.' },
    { id: 'h2', kind: 'brand', image: '', headlineAr: 'دماغ هادية، وأداء في القمة', headlineEn: 'Calm Mind. Peak Performance.', subAr: 'الالتزام الأول. وكل حاجة بعد كده بتيجي.', subEn: 'Discipline first. Everything else follows.' },
    { id: 'h3', kind: 'brand', image: '', headlineAr: 'دماغ هادية، وأداء في القمة', headlineEn: 'Calm Mind. Peak Performance.', subAr: 'كوليكشن جديد. نفس التركيز.', subEn: 'A new drop. The same focus.' },
  ],
  announcements: [
    { ar: 'الشحن مجاني فوق ١٥٠٠ ج.م', en: 'Free shipping on orders over 1500 EGP' },
    { ar: 'ادفع كاش لما الأوردر يوصلك، في كل مصر', en: 'Cash on delivery all over Egypt' },
    { ar: 'تبديل سهل في خلال ١٤ يوم', en: 'Easy exchange within 14 days' },
  ],
  shopImage: SCENES.all,
  bestSellerIds: [],
  community: DEFAULT_COMMUNITY,
};

export const DEFAULT_SETTINGS: SiteSettings = {
  freeShippingThreshold: 1500,
  instagram: '', tiktok: '', facebook: '',
  instapayHandle: '01003965158', walletNumber: '01003965158',
  metaPixelId: '', tiktokPixelId: '', gaId: '',
};

export async function seedIfEmpty(q: Queryable) {
  const [{ n }] = await q.query<{ n: number }>('SELECT count(*)::int AS n FROM products');
  const [{ s }] = await q.query<{ s: number }>('SELECT count(*)::int AS s FROM settings');
  if (n > 0 || s > 0) return false;

  await insertStarterCatalogue(q);
  let i = 0;
  for (const [id, ar, en, fee] of GOVERNORATES) {
    await q.query('INSERT INTO shipping_rates (id,name_ar,name_en,fee,sort) VALUES ($1,$2,$3,$4,$5)', [id, ar, en, fee, i++]);
  }
  await q.query(`INSERT INTO promo_codes (code,type,value,first_order_only) VALUES ('WELCOME10','percent',10,true)`);
  await q.query(`INSERT INTO settings (key,value) VALUES ('content',$1::jsonb),('site',$2::jsonb)`, [JSON.stringify(DEFAULT_CONTENT), JSON.stringify(DEFAULT_SETTINGS)]);
  return true;
}
