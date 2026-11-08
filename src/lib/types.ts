export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ar';
export const isLocale = (v: string): v is Locale => (LOCALES as readonly string[]).includes(v);

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'ONE'] as const;
export const CATEGORIES = ['t-shirts', 'tanks', 'shorts', 'socks', 'accessories'] as const;
export type Category = (typeof CATEGORIES)[number];
export const FITS = ['regular', 'compression'] as const;
/** The brand is men only for now. To add a section: extend this list, then add a filter and an admin field. */
export const GENDERS = ['men'] as const;
export const TAGS = ['new', 'best-seller', 'limited', 'sale'] as const;
export type Tag = (typeof TAGS)[number];

export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'returned', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const PAYMENT_METHODS = ['cod', 'instapay', 'wallet', 'card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface ProductColor {
  id: string;
  nameAr: string;
  nameEn: string;
  hex: string;
  images: string[];
}
export interface Variant { colorId: string; size: string; stock: number }

export interface Product {
  id: string;
  slug: string;
  sku: string;
  nameAr: string; nameEn: string;
  descAr: string; descEn: string;
  fabricAr: string; fabricEn: string;
  careAr: string; careEn: string;
  fitAr: string; fitEn: string;
  price: number;
  salePrice: number | null;
  category: Category;
  fit: string | null;
  gender: string;
  collection: string | null;
  tags: Tag[];
  colors: ProductColor[];
  video: string | null;
  /** What one piece costs to make, for profit. Admin only: never sent to the store. */
  costPrice?: number | null;
  status: 'active' | 'draft';
  featured: boolean;
  soldCount: number;
  createdAt: string;
  variants: Variant[];
  rating: number;
  reviewCount: number;
}

export interface Collection {
  slug: string; nameAr: string; nameEn: string; storyAr: string; storyEn: string; image: string; sort: number;
}

export interface OrderItem {
  productId: string; slug: string; nameAr: string; nameEn: string; sku: string;
  colorId: string; colorAr: string; colorEn: string; size: string; qty: number; price: number; image: string;
}
export interface OrderHistoryEntry { status: string; at: string; note?: string; by?: string }
export interface Order {
  id: string; number: string; customerId: string | null;
  name: string; phone: string; altPhone: string | null; email: string | null;
  governorate: string; city: string; address: string; notes: string | null;
  items: OrderItem[];
  subtotal: number; discount: number; shipping: number; total: number;
  promoCode: string | null;
  paymentMethod: PaymentMethod; paymentStatus: string; paymentProof: string | null; paymentRef: string | null;
  status: OrderStatus; history: OrderHistoryEntry[]; locale: Locale; createdAt: string;
}

export interface ShippingRate { id: string; nameAr: string; nameEn: string; fee: number; sort: number }

export interface Review {
  id: string; productId: string | null; name: string; city: string | null; rating: number; body: string;
  image: string | null; status: string; onHome: boolean; isDemo: boolean; createdAt: string;
}

export interface HeroSlide {
  id: string;
  /** "brand": dark background with the logo (uses the approved hero photo when there is one); "cover": full-bleed photo; "figure": transparent cutout. */
  kind: 'brand' | 'figure' | 'cover';
  image: string;
  video?: string;
  headlineAr: string; headlineEn: string;
  subAr: string; subEn: string;
}
export interface Localized { ar: string; en: string }
export interface SiteContent {
  hero: HeroSlide[];
  announcements: Localized[];
  featuredCollection: string;
  featuredCollectionImage: string;
  bestSellerIds: string[];
  community: string[];
  categoryImages: Record<string, string>;
}
export interface SiteSettings {
  freeShippingThreshold: number;
  instagram: string; tiktok: string; facebook: string;
  instapayHandle: string; walletNumber: string;
  metaPixelId: string; tiktokPixelId: string; gaId: string;
}
