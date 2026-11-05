'use client';
import { useState, useTransition } from 'react';
import { useI18n } from '../layout/I18nProvider';
import { submitContact } from '@/app/actions/shop';

export function ContactForm() {
  const { t } = useI18n();
  const c = t.contact;
  const [v, setV] = useState({ name: '', phone: '', email: '', body: '' });
  const [state, setState] = useState<'idle' | 'sent' | 'invalid' | 'rate'>('idle');
  const [pending, start] = useTransition();
  if (state === 'sent') return <p role="status" className="self-center border border-line p-8 text-center text-silver">{c.sent}</p>;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await submitContact(v); setState(r.ok ? 'sent' : r.error ?? 'invalid'); }); }}>
      <div><label className="label" htmlFor="c-name">{c.name}</label><input id="c-name" className="field" required autoComplete="name" value={v.name} onChange={set('name')} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="c-phone">{c.phone}</label><input id="c-phone" className="field" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" value={v.phone} onChange={set('phone')} /></div>
        <div><label className="label" htmlFor="c-email">{c.email}</label><input id="c-email" className="field" type="email" dir="ltr" autoComplete="email" value={v.email} onChange={set('email')} /></div>
      </div>
      <div><label className="label" htmlFor="c-body">{c.message}</label><textarea id="c-body" className="field min-h-[150px]" required value={v.body} onChange={set('body')} /></div>
      {state !== 'idle' && <p role="alert" className="error-text">{state === 'rate' ? c.rate : c.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{c.send}</button>
    </form>
  );
}
