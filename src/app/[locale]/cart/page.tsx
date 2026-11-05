import type { Metadata } from 'next';
import { CartPageView } from '@/components/checkout/CartPageView';

export const metadata: Metadata = { title: 'Cart', robots: { index: false } };

export default function CartPage() {
  return <CartPageView />;
}
