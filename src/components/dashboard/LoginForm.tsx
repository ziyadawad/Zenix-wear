'use client';
import { useActionState, useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { ownerLogin } from '@/app/dashboard/actions';
import { tr, type DashLang } from '@/lib/dashboard/lang';

export function DashboardLoginForm({ next, lang }: { next: string; lang: DashLang }) {
  const [state, action, pending] = useActionState(ownerLogin, null);
  const [show, setShow] = useState(false);
  const t = (ar: string, en: string) => tr(lang, ar, en);
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />
      <input type="text" name="username" autoComplete="username" value="zenix-owner" readOnly hidden />
      <div>
        <label className="label" htmlFor="password">{t('الباسورد', 'Password')}</label>
        {/* The password is typed left-to-right, so the eye sits on the right in both languages and the
            field keeps room for it on that same side: it can never cover the text. */}
        <div className="relative" dir="ltr">
          <input id="password" name="password" type={show ? 'text' : 'password'} className="field" style={{ paddingRight: '3.25rem' }}
            autoComplete="current-password" required autoFocus aria-invalid={state?.error ? true : undefined} aria-describedby={state?.error ? 'login-error' : undefined} />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t('اخفي الباسورد', 'Hide password') : t('اظهر الباسورد', 'Show password')} aria-pressed={show}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted transition-colors hover:text-white">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      {state?.error && (
        <div id="login-error" role="alert" className="rounded-md border border-danger/60 bg-danger/10 px-3 py-2.5 text-sm text-[#ff8a8e]">
          <p className="font-medium">{state.error}</p>
          {state.hint && <p className="mt-0.5 text-[13px] text-[#ffb3b5]">{state.hint}</p>}
        </div>
      )}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? t('لحظة…', 'One moment…') : t('ادخل', 'Log in')}</button>
      <a href={lang === 'en' ? '/en' : '/'} className="btn btn-ghost w-full !min-h-12"><ArrowLeft size={16} className="flip-rtl" aria-hidden="true" />{t('رجوع للموقع', 'Back to site')}</a>
    </form>
  );
}
