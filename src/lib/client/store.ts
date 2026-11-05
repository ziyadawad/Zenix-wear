'use client';
import { useSyncExternalStore } from 'react';

export interface CartItem {
  productId: string; colorId: string; size: string; qty: number;
  slug: string; nameAr: string; nameEn: string; image: string; price: number; compareAt: number | null;
  colorAr: string; colorEn: string; maxStock: number; sizes: { size: string; stock: number }[];
}

function createStore<T>(key: string, initial: T) {
  let state = initial;
  let loaded = false;
  const listeners = new Set<() => void>();
  const load = () => {
    if (loaded || typeof window === 'undefined') return;
    loaded = true;
    try {
      const raw = localStorage.getItem(key);
      if (raw) state = JSON.parse(raw);
    } catch { /* private mode or bad JSON: keep the default */ }
  };
  return {
    get: () => { load(); return state; },
    set(next: T) {
      load();
      state = next;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable */ }
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => { listeners.delete(l); };
    },
    use(): T {
      return useSyncExternalStore(this.subscribe, this.get, () => initial);
    },
  };
}

const lineId = (i: Pick<CartItem, 'productId' | 'colorId' | 'size'>) => `${i.productId}|${i.colorId}|${i.size}`;

// ---- Cart --------------------------------------------------------------------------------------
export const cartStore = createStore<CartItem[]>('zx_cart', []);
export const useCart = () => cartStore.use();
export const cartCount = (items: CartItem[]) => items.reduce((a, i) => a + i.qty, 0);
export const cartSubtotal = (items: CartItem[]) => items.reduce((a, i) => a + i.qty * i.price, 0);

export function addToCart(item: CartItem) {
  const items = cartStore.get();
  const existing = items.find((i) => lineId(i) === lineId(item));
  cartStore.set(existing
    ? items.map((i) => (i === existing ? { ...i, qty: Math.min(i.qty + item.qty, item.maxStock) } : i))
    : [...items, item]);
}
export function setQty(id: string, qty: number) {
  cartStore.set(cartStore.get().flatMap((i) => (lineId(i) !== id ? [i] : qty <= 0 ? [] : [{ ...i, qty: Math.min(qty, i.maxStock) }])));
}
export function changeSize(id: string, size: string) {
  const items = cartStore.get();
  const line = items.find((i) => lineId(i) === id);
  if (!line) return;
  const stock = line.sizes.find((s) => s.size === size)?.stock ?? 0;
  const moved = { ...line, size, maxStock: stock, qty: Math.min(line.qty, stock) };
  const other = items.find((i) => lineId(i) === lineId(moved));
  const rest = items.filter((i) => i !== line && i !== other);
  cartStore.set([...rest, other ? { ...other, qty: Math.min(other.qty + moved.qty, stock) } : moved]);
}
export const removeLine = (id: string) => cartStore.set(cartStore.get().filter((i) => lineId(i) !== id));
export const clearCart = () => cartStore.set([]);
export { lineId };

// ---- Promo code kept between cart and checkout ------------------------------------------------
export const promoStore = createStore<string>('zx_promo', '');
export const usePromo = () => promoStore.use();

// ---- Wishlist ----------------------------------------------------------------------------------
export const wishlistStore = createStore<string[]>('zx_wish', []);
export const useWishlist = () => wishlistStore.use();
export function toggleWish(id: string) {
  const w = wishlistStore.get();
  const on = !w.includes(id);
  wishlistStore.set(on ? [id, ...w] : w.filter((x) => x !== id));
  // Keeps the account's copy in step. The action does nothing for guests.
  import('@/app/actions/account').then((m) => m.setWishlistItem(id, on)).catch(() => {});
}

// ---- Recently viewed ---------------------------------------------------------------------------
export const recentStore = createStore<string[]>('zx_recent', []);
export const useRecent = () => recentStore.use();
export function pushRecent(id: string) {
  recentStore.set([id, ...recentStore.get().filter((x) => x !== id)].slice(0, 12));
}

// ---- UI state ----------------------------------------------------------------------------------
function createUiFlag() {
  let v = false;
  const ls = new Set<() => void>();
  const api = {
    get: () => v,
    set(n: boolean) { v = n; ls.forEach((l) => l()); },
    subscribe(l: () => void) { ls.add(l); return () => { ls.delete(l); }; },
    use: () => useSyncExternalStore(api.subscribe, api.get, () => false),
  };
  return api;
}
export const cartUi = createUiFlag();
export const searchUi = createUiFlag();
export const menuUi = createUiFlag();

// ---- Marketing pixels ----------------------------------------------------------------------
type W = { fbq?: (...a: unknown[]) => void; ttq?: { track: (...a: unknown[]) => void }; gtag?: (...a: unknown[]) => void };
export function track(event: 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase', data: { id?: string; name?: string; value: number; ids?: string[] }) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as W;
  const ids = data.ids ?? (data.id ? [data.id] : []);
  w.fbq?.('track', event, { content_ids: ids, content_name: data.name, content_type: 'product', value: data.value, currency: 'EGP' });
  w.ttq?.track(event === 'Purchase' ? 'CompletePayment' : event, { content_id: ids[0], content_type: 'product', value: data.value, currency: 'EGP' });
  const ga = { ViewContent: 'view_item', AddToCart: 'add_to_cart', InitiateCheckout: 'begin_checkout', Purchase: 'purchase' }[event];
  w.gtag?.('event', ga, { currency: 'EGP', value: data.value, items: ids.map((item_id) => ({ item_id })) });
}
