'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '../layout/I18nProvider';
import { requestPasswordReset, resetPassword } from '@/app/actions/account';
import { CONTACT } from '@/lib/utils';

/** Forgot password: handled on WhatsApp for now (no email service needed). Email reset links still work once email is set up. */
export function ForgotForm() {
  const { t, locale } = useI18n();
  const a = t.account;
  const [contact, setContact] = useState('');
  const [state, setState] = useState<'idle' | 'sent'>('idle');
  const [pending, start] = useTransition();
  const wa = `${CONTACT.whatsappUrl}?text=${encodeURIComponent(a.forgotMessage + contact.trim())}`;
  return (
    <>
      <h1 className="display text-[clamp(1.6rem,3.4vw,2.4rem)]">{a.forgotTitle}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">{a.forgotWhatsapp}</p>
      <div className="mt-6 space-y-4">
        <div><label className="label" htmlFor="f-c">{a.emailOrPhone}</label><input id="f-c" className="field" dir="ltr" autoComplete="username" value={contact} onChange={(e) => setContact(e.target.value)} /></div>
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">{a.forgotButton}</a>
        {/* Email reset, only when an email service is set up (RESEND_API_KEY). Otherwise the server says "off" and nothing is sent. */}
        {state === 'idle' && contact.includes('@') && (
          <button type="button" className="btn btn-ghost w-full !min-h-11" disabled={pending}
            onClick={() => start(async () => { const r = await requestPasswordReset(contact, locale); if (!r.off) setState('sent'); })}>{a.sendLink}</button>
        )}
        {state === 'sent' && <p role="status" className="border border-line p-4 text-sm text-silver">{a.linkSent}</p>}
      </div>
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
