import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getShippingRates } from '@/lib/catalog';
import { toOrder } from '@/lib/orders';
import type { Locale } from '@/lib/types';
import { AuthForms, AddressBook, AccountWishlist, LogoutButton } from '@/components/account/AccountViews';
import { OrderCard } from '@/components/account/OrderCard';

export const metadata: Metadata = { title: 'Account', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AccountPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const user = await currentUser();
  if (!user) {
    return (
      <div className="container-zx mx-auto max-w-[480px] py-12 md:py-20">
        <AuthForms />
      </div>
    );
  }
  const [orders, addresses, rates] = await Promise.all([
    // Their orders, including ones placed as a guest with the same phone or email before signing up.
    db.query(`SELECT * FROM orders WHERE customer_id = $1 OR (customer_id IS NULL AND ((phone = $2 AND $2 <> '') OR (lower(email) = $3 AND $3 <> ''))) ORDER BY created_at DESC LIMIT 50`, [user.id, user.phone ?? '', (user.email ?? '').toLowerCase()]),
    db.query<{ id: string; name: string; phone: string; governorate: string; city: string; address: string }>('SELECT id,name,phone,governorate,city,address FROM addresses WHERE customer_id = $1 ORDER BY created_at DESC', [user.id]),
    getShippingRates(),
  ]);
  return (
    <div className="container-zx mx-auto max-w-[1100px] py-10 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="display text-[clamp(1.7rem,3.8vw,2.8rem)]">{t.account.welcome.replace('{name}', user.name.split(' ')[0])}</h1>
          <p className="mt-2 text-sm text-muted">{[user.phone && <span key="p" dir="ltr">{user.phone}</span>, user.email && <span key="e" className="break-all">{user.email}</span>].filter(Boolean).reduce<React.ReactNode[]>((acc, x, i) => (i ? [...acc, ' · ', x] : [x]), [])}</p>
        </div>
        <LogoutButton />
      </div>
      <section className="mt-10" aria-labelledby="acc-o">
        <h2 id="acc-o" className="eyebrow mb-5">{t.account.orders}</h2>
        {orders.length === 0 ? (
          <div className="border border-line p-8 text-center"><p className="text-muted">{t.account.noOrders}</p><Link href={`/${locale}/shop`} className="btn btn-ghost mt-5">{t.home.shopNow}</Link></div>
        ) : (
          <ul className="space-y-3">{orders.map((r) => <OrderCard key={r.id} order={toOrder(r)} />)}</ul>
        )}
      </section>
      <section className="mt-12" aria-labelledby="acc-a">
        <h2 id="acc-a" className="eyebrow mb-5">{t.account.addresses}</h2>
        <AddressBook addresses={addresses} rates={rates} />
      </section>
      <section className="mt-12" aria-labelledby="acc-w">
        <h2 id="acc-w" className="eyebrow mb-5">{t.account.wishlist}</h2>
        <AccountWishlist />
      </section>
    </div>
  );
}
