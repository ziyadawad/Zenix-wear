'use client';
import { useActionState, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { ownerLogin } from '@/app/dashboard/actions';

export function DashboardLoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(ownerLogin, null);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <input type="text" name="username" autoComplete="username" value="zenix-owner" readOnly hidden />
      <div>
        <label className="label" htmlFor="password">الباسورد</label>
        <div className="relative">
          <input id="password" name="password" type={show ? 'text' : 'password'} className="field !pe-12" autoComplete="current-password" required autoFocus dir="ltr" />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'اخفي الباسورد' : 'اظهر الباسورد'} className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-muted hover:text-white">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
      </div>
      {state?.error && <p className="text-sm text-[#ff8a8e]" role="alert">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? 'لحظة…' : 'ادخل'}</button>
    </form>
  );
}
