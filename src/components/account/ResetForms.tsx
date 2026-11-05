'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '../layout/I18nProvider';
import { requestPasswordReset, resetPassword } from '@/app/actions/account';
import { CONTACT } from '@/lib/utils';

export function ForgotForm() {
  const { t, locale } = useI18n();
  const a = t.account;
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sent' | 'off'>('idle');
  const [pending, start] = useTransition();
  return (
    <>
      <h1 className="display text-[clamp(1.6rem,3.4vw,2.4rem)]">{a.forgotTitle}</h1>
      <p className="mt-3 text-sm text-muted">{a.forgotIntro}</p>
      {state === 'sent' && <p role="status" className="mt-6 border border-line p-4 text-sm text-silver">{a.linkSent}</p>}
      {state === 'off' && <p role="status" className="mt-6 border border-line p-4 text-sm text-silver">{a.emailOff} <a className="underline" href={CONTACT.whatsappUrl}>{t.contact.whatsapp}</a></p>}
      {state === 'idle' && (
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await requestPasswordReset(email, locale); setState(r.off ? 'off' : 'sent'); }); }}>
          <div><label className="label" htmlFor="f-e">{a.email}</label><input id="f-e" className="field" type="email" dir="ltr" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button className="btn btn-primary w-full" disabled={pending}>{a.sendLink}</button>
        </form>
      )}
    </>
  );
}

export function ResetForm() {
  const { t, lp } = useI18n();
  const a = t.account;
  const token = useSearchParams().get('token') ?? '';
  const [pw, setPw] = useState('');
  const [state, setState] = useState<'idle' | 'done' | 'password' | 'invalid'>('idle');
  const [pending, start] = useTransition();
  if (state === 'done') return <div className="text-center"><p role="status" className="text-silver">{a.resetDone}</p><Link href={lp('/account')} className="btn btn-primary mt-6">{a.login}</Link></div>;
  if (state === 'invalid') return <p role="alert" className="text-center text-[#ff9a9d]">{a.resetInvalid}</p>;
  return (
    <>
      <h1 className="display text-[clamp(1.6rem,3.4vw,2.4rem)]">{a.resetTitle}</h1>
      <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await resetPassword(token, pw); setState(r.ok ? 'done' : r.error ?? 'invalid'); }); }}>
        <div><label className="label" htmlFor="r-p">{a.newPassword}</label><input id="r-p" className="field" type="password" dir="ltr" required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={state === 'password'} /></div>
        {state === 'password' && <p className="error-text" role="alert">{a.passwordMin}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>{a.savePassword}</button>
      </form>
    </>
  );
}
