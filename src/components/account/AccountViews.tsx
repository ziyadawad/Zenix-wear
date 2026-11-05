'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '../layout/I18nProvider';
import { WishlistView } from '../shop/WishlistView';
import { deleteAddress, login, logout, register, saveAddress, syncWishlist, type AuthResult } from '@/app/actions/account';
import { wishlistStore } from '@/lib/client/store';
import type { ShippingRate } from '@/lib/types';
import { cx } from '@/lib/utils';

export function AuthForms() {
  const { t, lp } = useI18n();
  const a = t.account;
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [v, setV] = useState({ name: '', email: '', phone: '', identifier: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const message = (r: Exclude<AuthResult, { ok: true }>) => ({
    invalid: a.invalid, exists: a.exists, password: a.passwordMin, phone: t.checkout.errors.phone, email: t.checkout.errors.email, name: t.checkout.errors.name, rate: a.rate,
  })[r.error];
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = mode === 'login' ? await login({ identifier: v.identifier, password: v.password }) : await register(v);
      if (r.ok) router.refresh();
      else setError(message(r));
    });
  };
  return (
    <div>
      <h1 className="display mb-8 text-center text-[clamp(1.7rem,3.8vw,2.6rem)]">{mode === 'login' ? a.login : a.register}</h1>
      <div className="grid grid-cols-2 border-b border-line" role="tablist">
        {(['login', 'register'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); }} className={cx('-mb-px min-h-12 border-b text-sm', mode === m ? 'border-white' : 'border-transparent text-muted')}>{m === 'login' ? a.login : a.register}</button>
        ))}
      </div>
      <form className="mt-8 space-y-4" onSubmit={submit}>
        {mode === 'register' ? (
          <>
            <div><label className="label" htmlFor="a-name">{a.name}</label><input id="a-name" className="field" autoComplete="name" required value={v.name} onChange={set('name')} /></div>
            <div><label className="label" htmlFor="a-email">{a.email}</label><input id="a-email" className="field" type="email" dir="ltr" autoComplete="email" required value={v.email} onChange={set('email')} /></div>
            <div><label className="label" htmlFor="a-phone">{a.phone}</label><input id="a-phone" className="field" type="tel" dir="ltr" autoComplete="tel-national" placeholder="01xxxxxxxxx" required value={v.phone} onChange={set('phone')} /></div>
          </>
        ) : (
          <div><label className="label" htmlFor="a-id">{a.emailOrPhone}</label><input id="a-id" className="field" dir="ltr" autoComplete="username" required value={v.identifier} onChange={set('identifier')} /></div>
        )}
        <div><label className="label" htmlFor="a-pw">{a.password}</label><input id="a-pw" className="field" type="password" dir="ltr" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 8 : undefined} value={v.password} onChange={set('password')} /></div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>{mode === 'login' ? a.login : a.register}</button>
        {mode === 'login' && <Link href={lp('/account/forgot')} className="block py-2 text-center text-sm text-muted underline-offset-4 hover:underline">{a.forgot}</Link>}
      </form>
    </div>
  );
}

export function LogoutButton() {
  const { t, locale } = useI18n();
  const [pending, start] = useTransition();
  return <button className="btn btn-ghost !min-h-11" disabled={pending} onClick={() => start(() => logout(locale))}>{t.account.logout}</button>;
}

export function AccountWishlist() {
  useEffect(() => {
    syncWishlist(wishlistStore.get()).then((ids) => wishlistStore.set(ids)).catch(() => {});
  }, []);
  return <WishlistView />;
}

interface Address { id: string; name: string; phone: string; governorate: string; city: string; address: string }
export function AddressBook({ addresses, rates }: { addresses: Address[]; rates: ShippingRate[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ name: '', phone: '', governorate: '', city: '', address: '' });
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <div>
      {addresses.length === 0 && !open && <p className="text-sm text-muted">{t.account.noAddresses}</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {addresses.map((a) => {
          const gov = rates.find((r) => r.id === a.governorate);
          return (
            <li key={a.id} className="flex items-start justify-between gap-4 border border-line p-4 text-sm leading-[1.8]">
              <p>{a.name}<br /><span className="text-muted" dir="ltr">{a.phone}</span><br /><span className="text-muted">{a.address}, {a.city}, {gov ? (locale === 'ar' ? gov.nameAr : gov.nameEn) : a.governorate}</span></p>
              <button className="min-h-11 flex-none text-xs text-muted underline" onClick={() => start(async () => { await deleteAddress(a.id); router.refresh(); })}>{t.account.deleteAddress}</button>
            </li>
          );
        })}
      </ul>
      {open ? (
        <form className="mt-4 grid max-w-[640px] gap-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveAddress(v); setError(!r.ok); if (r.ok) { setOpen(false); setV({ name: '', phone: '', governorate: '', city: '', address: '' }); router.refresh(); } }); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" required aria-label={t.checkout.name} placeholder={t.checkout.name} value={v.name} onChange={set('name')} />
            <input className="field" required dir="ltr" type="tel" aria-label={t.checkout.phone} placeholder="01xxxxxxxxx" value={v.phone} onChange={set('phone')} />
          </div>
          <select className="field" required aria-label={t.checkout.governorate} value={v.governorate} onChange={set('governorate')}>
            <option value="">{t.checkout.selectGov}</option>
            {rates.map((r) => <option key={r.id} value={r.id}>{locale === 'ar' ? r.nameAr : r.nameEn}</option>)}
          </select>
          <input className="field" required aria-label={t.checkout.city} placeholder={t.checkout.city} value={v.city} onChange={set('city')} />
          <input className="field" required minLength={8} aria-label={t.checkout.address} placeholder={t.checkout.addressHint} value={v.address} onChange={set('address')} />
          {error && <p className="error-text" role="alert">{t.common.error}</p>}
          <button className="btn btn-primary sm:w-fit" disabled={pending}>{t.account.saveAddress}</button>
        </form>
      ) : (
        <button className="btn btn-ghost !min-h-11 mt-4" onClick={() => setOpen(true)}>{t.account.addAddress}</button>
      )}
    </div>
  );
}
