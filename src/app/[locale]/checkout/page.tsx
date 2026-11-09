import type { Metadata } from 'next';
import { getCheckoutConfig } from '@/app/actions/shop';
import { getShippingRates } from '@/lib/catalog';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const [config, rates, user] = await Promise.all([getCheckoutConfig(), getShippingRates(), currentUser()]);
  const addresses = user ? await db.query<{ id: string; name: string; phone: string; governorate: string; city: string; address: string }>('SELECT id,name,phone,governorate,city,address FROM addresses WHERE customer_id = $1 ORDER BY created_at DESC', [user.id]) : [];
  return <CheckoutForm config={config} rates={rates} user={user ? { name: user.name, email: user.email ?? '', phone: user.phone ?? '' } : null} addresses={addresses} />;
}
