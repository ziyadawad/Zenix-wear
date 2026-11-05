import type { Queryable } from './index';
import type { ProductColor, SiteContent, SiteSettings } from '../types';

const P = '/images/products/';
const E = '/images/editorial/';

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
  black: ['أسود', 'Black', '#0d0d0d'], charcoal: ['فحمي', 'Charcoal', '#37383b'], graphite: ['جرافيت', 'Graphite', '#5c5e62'],
  stone: ['حجري', 'Stone', '#96938c'], bone: ['عاجي', 'Bone', '#ded8ca'], olive: ['زيتوني', 'Olive', '#4a5038'],
  navy: ['كحلي', 'Navy', '#262f48'], wine: ['نبيتي', 'Wine', '#561c26'], silver: ['فضي', 'Silver', '#b2b4b8'], sand: ['رملي', 'Sand', '#b09b7a'],
};

/** "a:black" = tee render A, "b:navy" = tee render B, otherwise a studio render base such as "over-black". */
function color(spec: string): ProductColor {
  let id: string; let images: string[];
  if (spec.startsWith('a:') || spec.startsWith('b:')) {
    const [t, c] = spec.split(':');
    id = c;
    images = [1, 2, 3].map((i) => `${P}tee-${t}-${c}-${i}.webp`);
  } else {
    id = spec.split('-')[1];
    images = [1, 2].map((i) => `${P}${spec}-${i}.webp`);
  }
  const [nameAr, nameEn, hex] = COLOR[id];
  return { id, nameAr, nameEn, hex, images };
}

const FABRIC = {
  tee: { ar: '٩٢٪ بوليستر معاد تدويره، ٨٪ إيلاستين. قماش خفيف بيطرد العرق وينشف بسرعة.', en: '92% recycled polyester, 8% elastane. Lightweight, moisture-wicking and quick drying.' },
  cotton: { ar: '١٠٠٪ قطن مصري ثقيل ٢٤٠ جرام، ناعم على الجلد ومغسول مسبقًا.', en: '100% heavyweight Egyptian cotton, 240 GSM. Soft-washed and pre-shrunk.' },
  comp: { ar: '٧٨٪ نايلون، ٢٢٪ إيلاستين. ضغط رباعي الاتجاه يدعم العضلة أثناء التمرين.', en: '78% nylon, 22% elastane. Four-way compression that supports muscle during training.' },
  short: { ar: '٨٨٪ بوليستر، ١٢٪ سبانديكس. مرن بأربع اتجاهات مع جيوب بسوستة.', en: '88% polyester, 12% spandex. Four-way stretch with zipped pockets.' },
  sock: { ar: '٨٠٪ قطن، ١٨٪ نايلون، ٢٪ إيلاستين. نعل مبطن ودعم لقوس القدم.', en: '80% cotton, 18% nylon, 2% elastane. Cushioned sole with arch support.' },
  acc: { ar: 'خامات متينة بتشطيب مطفي وشعار ZENIX مطرز.', en: 'Durable materials with a matte finish and an embroidered ZENIX mark.' },
};
const CARE = {
  ar: 'يُغسل في الغسالة على ماء بارد بألوان مماثلة. لا يُستخدم مبيض أو منعم. يُنشر في الظل ويُكوى على حرارة منخفضة.',
  en: 'Machine wash cold with like colours. Do not bleach or use softener. Dry in the shade and iron on low.',
};
const FIT_INFO: Record<string, { ar: string; en: string }> = {
  regular: { ar: 'قصّة عادية مريحة. اختار مقاسك المعتاد.', en: 'Regular, comfortable fit. Take your usual size.' },
  oversized: { ar: 'قصّة واسعة بكتف نازل. للمظهر الأوسع خد مقاسك، وللمظهر الأقرب للجسم خد مقاس أصغر.', en: 'Boxy fit with a dropped shoulder. Take your usual size for the full look, or one size down for a closer fit.' },
  compression: { ar: 'قصّة ضاغطة ملاصقة للجسم. لو بتفضل راحة أكتر خد مقاس أكبر.', en: 'Tight compression fit. Size up if you prefer more room.' },
  none: { ar: 'مقاس مريح مناسب للتمرين واليوم العادي.', en: 'Comfortable fit for training and everyday wear.' },
};

interface SeedProduct {
  slug: string; ar: string; en: string; da: string; de: string; price: number; sale?: number;
  cat: string; fit?: string; gender: string; col?: string; tags: string[]; colors: string[];
  sizes?: string[]; fabric: keyof typeof FABRIC; sold: number; featured?: boolean; age: number;
}
const APPAREL = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

const PRODUCTS: SeedProduct[] = [
  // ---- T-shirts: regular ----
  { slug: 'zenith-core-tee', ar: 'تيشيرت زينيث الأساسي', en: 'Zenith Core Tee', da: 'التيشيرت اللي بدأت بيه الحكاية. قصّة نضيفة، خياطة رجلان، وقماش خفيف بيفضل ناشف مهما زاد التمرين.', de: 'The tee that started it all. A clean silhouette, raglan seams and a lightweight fabric that stays dry however hard you train.', price: 690, cat: 't-shirts', fit: 'regular', gender: 'men', col: 'zenith', tags: ['best-seller'], colors: ['a:black', 'a:graphite', 'a:bone'], fabric: 'tee', sold: 420, featured: true, age: 40 },
  { slug: 'apex-raglan-tee', ar: 'تيشيرت أبيكس رجلان', en: 'Apex Raglan Tee', da: 'كم رجلان بيتحرك معاك في كل رفعة، مع نسيج محفور على الصدر للتهوية.', de: 'Raglan sleeves that move with every lift, with an engineered chest knit for ventilation.', price: 750, cat: 't-shirts', fit: 'regular', gender: 'men', col: 'zenith', tags: ['best-seller', 'new'], colors: ['b:charcoal', 'b:navy', 'b:stone'], fabric: 'tee', sold: 365, featured: true, age: 4 },
  { slug: 'still-mind-tee', ar: 'تيشيرت ستيل مايند', en: 'Still Mind Tee', da: 'هادي في شكله، قوي في أدائه. لون أرضي وقصّة مناسبة للجيم وللشارع.', de: 'Quiet in design, strong in performance. Earthy tones in a cut made for the gym and the street.', price: 720, cat: 't-shirts', fit: 'regular', gender: 'unisex', col: 'zen', tags: ['new'], colors: ['b:sand', 'b:olive', 'b:bone'], fabric: 'tee', sold: 150, age: 6 },
  { slug: 'orbit-performance-tee', ar: 'تيشيرت أوربت للأداء', en: 'Orbit Performance Tee', da: 'مصمم للتمارين الطويلة: خفيف، مرن، وبيحافظ على شكله غسلة بعد غسلة.', de: 'Made for long sessions: light, flexible and holds its shape wash after wash.', price: 790, sale: 590, cat: 't-shirts', fit: 'regular', gender: 'men', tags: ['sale'], colors: ['a:silver', 'a:black', 'a:wine'], fabric: 'tee', sold: 280, age: 70 },
  { slug: 'peak-001-limited-tee', ar: 'تيشيرت بيك ٠٠١ الإصدار المحدود', en: 'Peak 001 Limited Tee', da: 'أول إصدار محدود من ZENIX. كمية قليلة ومش هترجع تاني.', de: 'The first ZENIX limited release. A small run that will not come back.', price: 950, cat: 't-shirts', fit: 'regular', gender: 'men', col: 'limited-drop', tags: ['limited', 'new'], colors: ['b:wine', 'a:navy'], sizes: ['M', 'L', 'XL'], fabric: 'tee', sold: 88, featured: true, age: 2 },
  // ---- T-shirts: oversized ----
  { slug: 'monolith-oversized-tee', ar: 'تيشيرت مونوليث أوفرسايز', en: 'Monolith Oversized Tee', da: 'قطن مصري ثقيل بقصّة واسعة وكتف نازل. قطعة أساسية في أي دولاب.', de: 'Heavyweight Egyptian cotton in a boxy cut with a dropped shoulder. A wardrobe foundation.', price: 850, cat: 't-shirts', fit: 'oversized', gender: 'unisex', col: 'zen', tags: ['best-seller'], colors: ['over-black', 'over-bone', 'over-charcoal'], fabric: 'cotton', sold: 390, featured: true, age: 30 },
  { slug: 'horizon-oversized-tee', ar: 'تيشيرت هورايزون أوفرسايز', en: 'Horizon Oversized Tee', da: 'خامة ناعمة وألوان هادية لما تحب تبان مرتاح من غير ما تفقد حضورك.', de: 'A soft hand-feel and calm tones for when you want ease without losing presence.', price: 850, cat: 't-shirts', fit: 'oversized', gender: 'unisex', col: 'zen', tags: ['new'], colors: ['over-stone', 'over-olive', 'over-black'], fabric: 'cotton', sold: 120, age: 3 },
  { slug: 'kinetic-oversized-tee', ar: 'تيشيرت كينيتك أوفرسايز', en: 'Kinetic Oversized Tee', da: 'وزن متوسط يخليه مناسب لتمارين الكارديو والجو الدافي.', de: 'A mid-weight build that suits cardio work and warmer days.', price: 820, sale: 690, cat: 't-shirts', fit: 'oversized', gender: 'men', tags: ['sale'], colors: ['over-charcoal', 'over-bone'], fabric: 'cotton', sold: 175, age: 90 },
  { slug: 'luna-oversized-tee', ar: 'تيشيرت لونا أوفرسايز للبنات', en: 'Luna Oversized Tee', da: 'قصّة واسعة مصممة لجسم البنات، أقصر شوية عشان تتلبس على الليجنز.', de: 'A relaxed fit shaped for women, cut slightly shorter to sit over leggings.', price: 790, cat: 't-shirts', fit: 'oversized', gender: 'women', col: 'zen', tags: ['new'], colors: ['over-bone', 'over-black', 'over-olive'], sizes: ['XS', 'S', 'M', 'L', 'XL'], fabric: 'cotton', sold: 96, age: 8 },
  // ---- T-shirts: compression ----
  { slug: 'phantom-compression-tee', ar: 'تيشيرت فانتوم كومبريشن', en: 'Phantom Compression Tee', da: 'ملاصق للجسم ويبرز كل عضلة، بضغط بيساعدك تحس بشغل العضلة في كل عدة.', de: 'Second-skin fit with compression that keeps you connected to every rep.', price: 890, cat: 't-shirts', fit: 'compression', gender: 'men', col: 'zenith', tags: ['best-seller'], colors: ['a:black', 'a:navy'], fabric: 'comp', sold: 340, featured: true, age: 25 },
  { slug: 'titan-dri-fit-tee', ar: 'تيشيرت تايتن دراي فيت', en: 'Titan Dri-Fit Tee', da: 'خياطة مسطحة مش بتحك في الجلد وقماش بينشف في دقايق.', de: 'Flatlock seams that never chafe and fabric that dries in minutes.', price: 890, cat: 't-shirts', fit: 'compression', gender: 'men', col: 'zenith', tags: ['new'], colors: ['b:graphite', 'b:charcoal', 'b:silver'], fabric: 'comp', sold: 210, age: 5 },
  { slug: 'aero-dri-fit-tee', ar: 'تيشيرت آيرو دراي فيت', en: 'Aero Dri-Fit Tee', da: 'أخف تيشيرت عندنا. تهوية كاملة للجري والكارديو.', de: 'Our lightest tee. Full ventilation for running and cardio.', price: 790, cat: 't-shirts', fit: 'compression', gender: 'unisex', tags: [], colors: ['a:stone', 'a:olive', 'a:sand'], fabric: 'comp', sold: 140, age: 50 },
  { slug: 'vertex-compression-tee', ar: 'تيشيرت فيرتكس كومبريشن', en: 'Vertex Compression Tee', da: 'ضغط عالي على الصدر والضهر مع مساحة حركة كاملة للكتف.', de: 'High compression through chest and back with a full range of shoulder motion.', price: 920, cat: 't-shirts', fit: 'compression', gender: 'men', tags: [], colors: ['b:charcoal', 'a:graphite'], fabric: 'comp', sold: 130, age: 35 },
  // ---- Tanks ----
  { slug: 'core-tank', ar: 'تانك توب كور', en: 'Core Tank', da: 'فتحة ذراع واسعة وقماش خفيف. حرية حركة كاملة في يوم الكتف.', de: 'Wide armholes and light fabric. Total freedom of movement on shoulder day.', price: 550, cat: 'tanks', gender: 'men', col: 'zenith', tags: ['best-seller'], colors: ['tank-black', 'tank-charcoal'], fabric: 'tee', sold: 260, age: 28 },
  { slug: 'serene-tank', ar: 'تانك توب سيرين للبنات', en: 'Serene Tank', da: 'قصّة ناعمة ومريحة مناسبة لليوجا والبيلاتس والجيم.', de: 'A soft, easy cut for yoga, pilates and the gym.', price: 520, cat: 'tanks', gender: 'women', col: 'zen', tags: ['new'], colors: ['tank-bone', 'tank-black'], sizes: ['XS', 'S', 'M', 'L', 'XL'], fabric: 'tee', sold: 90, age: 7 },
  { slug: 'zero-stringer', ar: 'سترينجر زيرو', en: 'Zero Stringer', da: 'الكلاسيكي بتاع كمال الأجسام: حمالات رفيعة وفتحة عميقة.', de: 'The bodybuilding classic: thin straps and a deep cut.', price: 490, cat: 'tanks', gender: 'men', tags: [], colors: ['stringer-black', 'stringer-olive'], fabric: 'tee', sold: 170, age: 45 },
  { slug: 'apex-stringer', ar: 'سترينجر أبيكس', en: 'Apex Stringer', da: 'قطن مرن بيتحمل أصعب التمارين ولونه ثابت.', de: 'Stretch cotton that takes the hardest sessions and keeps its colour.', price: 520, sale: 420, cat: 'tanks', gender: 'men', tags: ['sale'], colors: ['stringer-stone', 'stringer-black'], fabric: 'cotton', sold: 110, age: 80 },
  // ---- Shorts ----
  { slug: 'pace-training-shorts', ar: 'شورت بيس للتمرين', en: 'Pace Training Shorts', da: 'طول ٥ بوصة، خامة مرنة وجيوب بسوستة لتليفونك ومفاتيحك.', de: 'A 5-inch inseam in stretch fabric with zipped pockets for phone and keys.', price: 750, cat: 'shorts', gender: 'men', col: 'zenith', tags: ['best-seller'], colors: ['shorts-black', 'shorts-charcoal'], fabric: 'short', sold: 300, featured: true, age: 22 },
  { slug: 'stillness-shorts', ar: 'شورت ستيلنس', en: 'Stillness Shorts', da: 'وسط مريح برباط، مناسب للتمرين والراحة بعده.', de: 'A comfortable drawcord waist, right for the workout and the rest after it.', price: 690, cat: 'shorts', gender: 'unisex', col: 'zen', tags: ['new'], colors: ['shorts2-black', 'shorts2-olive', 'shorts2-navy'], fabric: 'short', sold: 130, age: 9 },
  { slug: 'core-stone-shorts', ar: 'شورت كور', en: 'Core Shorts', da: 'الشورت اليومي: بسيط، خفيف، وينفع لأي تمرين.', de: 'The everyday short: simple, light and right for any session.', price: 650, sale: 520, cat: 'shorts', gender: 'men', tags: ['sale'], colors: ['shorts-stone', 'shorts-black'], fabric: 'short', sold: 160, age: 75 },
  // ---- Socks ----
  { slug: 'zenix-crew-socks', ar: 'شراب ZENIX طويل', en: 'ZENIX Crew Socks', da: 'نعل مبطن ودعم لقوس القدم عشان تقف ثابت في كل رفعة.', de: 'A cushioned sole and arch support to keep you planted on every lift.', price: 180, cat: 'socks', gender: 'unisex', tags: ['best-seller'], colors: ['socks-black', 'socks-bone', 'socks-charcoal'], sizes: ['S', 'M', 'L'], fabric: 'sock', sold: 510, age: 33 },
  { slug: 'grip-training-socks', ar: 'شراب جريب للتمرين', en: 'Grip Training Socks', da: 'نعل مانع للانزلاق للتمارين على الأرض والديدليفت.', de: 'A non-slip sole for floor work and deadlifts.', price: 240, cat: 'socks', gender: 'unisex', tags: ['new'], colors: ['socks-charcoal', 'socks-black'], sizes: ['S', 'M', 'L'], fabric: 'sock', sold: 85, age: 10 },
  { slug: 'crew-socks-3-pack', ar: 'شراب طويل (٣ قطع)', en: 'Crew Socks 3-Pack', da: 'تلات أزواج بسعر أوفر لكل أيام الأسبوع.', de: 'Three pairs at a better price, for every day of the week.', price: 450, sale: 390, cat: 'socks', gender: 'unisex', tags: ['sale'], colors: ['socks-black', 'socks-bone'], sizes: ['S', 'M', 'L'], fabric: 'sock', sold: 200, age: 55 },
  // ---- Accessories ----
  { slug: 'zen-cap', ar: 'كاب زين', en: 'Zen Cap', da: 'كاب قطن بستة ألواح وظهر قابل للضبط، وشعار Z مطرز.', de: 'Six-panel cotton cap with an adjustable back and embroidered Z.', price: 450, cat: 'accessories', gender: 'unisex', col: 'zen', tags: ['best-seller'], colors: ['cap-black', 'cap-stone'], sizes: ['ONE'], fabric: 'acc', sold: 240, age: 20 },
  { slug: 'peak-cap', ar: 'كاب بيك', en: 'Peak Cap', da: 'حافة منحنية وخامة خفيفة بتنشف بسرعة.', de: 'A curved brim in a light, quick-drying fabric.', price: 490, cat: 'accessories', gender: 'unisex', tags: ['new'], colors: ['cap-olive', 'cap-black'], sizes: ['ONE'], fabric: 'acc', sold: 70, age: 6 },
  { slug: 'focus-gym-towel', ar: 'فوطة جيم فوكس', en: 'Focus Gym Towel', da: 'مايكروفايبر سريع الامتصاص بحجم مناسب لشنطة الجيم.', de: 'Fast-absorbing microfibre, sized for your gym bag.', price: 350, cat: 'accessories', gender: 'unisex', tags: [], colors: ['towel-black', 'towel-charcoal'], sizes: ['ONE'], fabric: 'acc', sold: 190, age: 38 },
  { slug: 'zenith-duffel-bag', ar: 'شنطة زينيث دافل', en: 'Zenith Duffel Bag', da: 'شنطة جيم واسعة بجيب منفصل للجزمة وتشطيب مقاوم للمية.', de: 'A roomy gym bag with a separate shoe pocket and a water-resistant finish.', price: 1450, cat: 'accessories', gender: 'unisex', col: 'zenith', tags: ['limited'], colors: ['bag-black', 'bag-charcoal'], sizes: ['ONE'], fabric: 'acc', sold: 65, featured: true, age: 15 },
];

const REVIEWS: [string, string, number, string, string, string][] = [
  ['أحمد م.', 'القاهرة', 5, 'الخامة ممتازة والمقاس مظبوط جدًا. لبسته في أصعب تمرين ومحستش بأي حرارة.', 'zenith-core-tee', `${P}tee-a-black-1.webp`],
  ['Omar K.', 'Giza', 5, 'Best fitting compression tee I have owned. The fabric feels premium and it arrived in two days.', 'phantom-compression-tee', `${P}tee-a-navy-1.webp`],
  ['محمد ع.', 'الإسكندرية', 4, 'التيشيرت الأوفرسايز تقيل وشكله فخم. التوصيل كان سريع والدفع عند الاستلام سهّل الموضوع.', 'monolith-oversized-tee', `${P}over-black-1.webp`],
  ['سارة ح.', 'المنصورة', 5, 'أخيرًا براند مصري بالجودة دي. القماش ناعم والتغليف شيك جدًا.', 'luna-oversized-tee', `${E}woman-portrait.webp`],
  ['Youssef T.', 'Cairo', 5, 'Exchanged a size with no problem at all. Great customer service on WhatsApp.', 'apex-raglan-tee', `${P}tee-b-charcoal-1.webp`],
  ['كريم س.', 'طنطا', 5, 'الشورت مرن وخفيف، وجيوب السوستة حاجة عملية جدًا في الجيم.', 'pace-training-shorts', `${P}shorts-black-1.webp`],
];

export const DEFAULT_CONTENT: SiteContent = {
  hero: [
    { id: 'h1', kind: 'figure', image: '/images/hero/figure-1.webp', headlineAr: 'عقل هادي، وأداء في القمة', headlineEn: 'Calm Mind. Peak Performance.', subAr: 'ملابس رياضية فاخرة مصممة في مصر، لمن يتدرب بتركيز.', subEn: 'Premium sportswear designed in Egypt, for those who train with focus.' },
    { id: 'h2', kind: 'cover', image: `${E}deadlift.webp`, headlineAr: 'عقل هادي، وأداء في القمة', headlineEn: 'Calm Mind. Peak Performance.', subAr: 'الانضباط أولًا. كل شيء آخر يأتي بعده.', subEn: 'Discipline first. Everything else follows.' },
    { id: 'h3', kind: 'cover', image: `${E}barbell-woman.webp`, headlineAr: 'عقل هادي، وأداء في القمة', headlineEn: 'Calm Mind. Peak Performance.', subAr: 'مجموعة جديدة. نفس التركيز.', subEn: 'A new drop. The same focus.' },
  ],
  announcements: [
    { ar: 'شحن مجاني للطلبات فوق ١٥٠٠ ج.م', en: 'Free shipping on orders over 1500 EGP' },
    { ar: 'الدفع عند الاستلام في كل مصر', en: 'Cash on delivery all over Egypt' },
    { ar: 'استبدال سهل خلال ١٤ يوم', en: 'Easy exchange within 14 days' },
  ],
  featuredCollection: 'zenith',
  featuredCollectionImage: `${E}pullup.webp`,
  bestSellerIds: [],
  community: [`${E}back.webp`, '/images/hero/figure-2-studio.webp', `${E}pullup.webp`, `${E}barbell-woman.webp`, `${E}seated.webp`, `${E}lift-hands.webp`],
  categoryImages: {
    't-shirts': '/images/hero/lineup.webp', tanks: `${E}back.webp`, shorts: `${E}deadlift-dark.webp`,
    socks: `${E}barbell-floor.webp`, accessories: `${E}rack.webp`, collections: `${E}gym-bw.webp`,
  },
};

export const DEFAULT_SETTINGS: SiteSettings = {
  freeShippingThreshold: 1500,
  instagram: '', tiktok: '', facebook: '',
  instapayHandle: '01003965158', walletNumber: '01003965158',
  metaPixelId: '', tiktokPixelId: '', gaId: '',
};

/** Stable pseudo-random stock, including a few sold-out and low-stock variants so those states are visible. */
function stockFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = h % 100;
  if (r < 10) return 0;
  if (r < 22) return 1 + (h % 3);
  return 8 + (h % 30);
}

export async function seedIfEmpty(q: Queryable) {
  const [{ n }] = await q.query<{ n: number }>('SELECT count(*)::int AS n FROM products');
  const [{ s }] = await q.query<{ s: number }>('SELECT count(*)::int AS s FROM settings');
  if (n > 0 || s > 0) return false;

  const collections = [
    ['zen', 'مجموعة زين', 'ZEN Collection', 'الهدوء قوة. قصّات واسعة وألوان أرضية وخامات ناعمة، لكل لحظة قبل التمرين وبعده.', 'Calm is a strength. Relaxed cuts, earthy tones and soft fabrics for every moment before and after the work.', `${E}woman-portrait.webp`, 1],
    ['zenith', 'مجموعة زينيث', 'ZENITH Collection', 'القمة بتتبني عدة بعد عدة. خامات أداء عالية وقصّات مصممة لأصعب أيامك، من غير ما تفقد تركيزك.', 'The peak is built rep by rep. High-performance fabrics and cuts engineered for your hardest days, without breaking your focus.', `${E}pullup.webp`, 2],
    ['limited-drop', 'الإصدار المحدود', 'Limited Drop', 'كميات قليلة وتصميمات مش هتتكرر. لما تخلص، بتخلص.', 'Small runs and designs that will not repeat. When they are gone, they are gone.', `${E}deadlift-dark.webp`, 3],
  ];
  for (const c of collections) {
    await q.query('INSERT INTO collections (slug,name_ar,name_en,story_ar,story_en,image,sort) VALUES ($1,$2,$3,$4,$5,$6,$7)', c);
  }

  let idx = 0;
  for (const p of PRODUCTS) {
    idx++;
    const id = p.slug;
    const colors = p.colors.map(color);
    const sizes = p.sizes ?? APPAREL;
    const fit = FIT_INFO[p.fit ?? 'none'];
    const fabric = FABRIC[p.fabric];
    await q.query(
      `INSERT INTO products (id,slug,sku,name_ar,name_en,desc_ar,desc_en,fabric_ar,fabric_en,care_ar,care_en,fit_ar,fit_en,price,sale_price,category,fit,gender,collection,tags,colors,featured,sold_count,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,$21::jsonb,$22,$23, now() - ($24 || ' days')::interval)`,
      [id, p.slug, `ZX-${String(idx).padStart(3, '0')}`, p.ar, p.en, p.da, p.de, fabric.ar, fabric.en, CARE.ar, CARE.en, fit.ar, fit.en, p.price, p.sale ?? null, p.cat, p.fit ?? null, p.gender, p.col ?? null, JSON.stringify(p.tags), JSON.stringify(colors), p.featured ?? false, p.sold, String(p.age)],
    );
    for (const c of colors) {
      for (const size of sizes) {
        await q.query('INSERT INTO product_variants (product_id,color_id,size,stock) VALUES ($1,$2,$3,$4)', [id, c.id, size, stockFor(`${p.slug}|${c.id}|${size}`)]);
      }
    }
  }

  let i = 0;
  for (const [id, ar, en, fee] of GOVERNORATES) {
    await q.query('INSERT INTO shipping_rates (id,name_ar,name_en,fee,sort) VALUES ($1,$2,$3,$4,$5)', [id, ar, en, fee, i++]);
  }
  let r = 0;
  for (const [name, city, rating, body, product, image] of REVIEWS) {
    await q.query(
      `INSERT INTO reviews (id,product_id,name,city,rating,body,image,status,on_home,is_demo,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'approved',true,true, now() - ($8 || ' days')::interval)`,
      [`demo-${r}`, product, name, city, rating, body, image, String(3 + r * 5)],
    );
    r++;
  }
  await q.query(`INSERT INTO promo_codes (code,type,value,first_order_only) VALUES ('WELCOME10','percent',10,true)`);
  await q.query(`INSERT INTO settings (key,value) VALUES ('content',$1::jsonb),('site',$2::jsonb)`, [JSON.stringify(DEFAULT_CONTENT), JSON.stringify(DEFAULT_SETTINGS)]);
  return true;
}
