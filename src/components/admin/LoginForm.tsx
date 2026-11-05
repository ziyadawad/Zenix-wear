'use client';
import { useActionState } from 'react';
import { adminLogin } from '@/app/admin/actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="field" autoComplete="username" required /></div>
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" className="field" autoComplete="current-password" required /></div>
      {state?.error && <p className="error-text" role="alert">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>Sign in</button>
    </form>
  );
}
