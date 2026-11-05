'use client';
import { useActionState, useEffect, useRef } from 'react';
import { createPromo } from '@/app/admin/actions';

export function PromoForm() {
  const [state, action, pending] = useActionState(createPromo, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <div><label className="label" htmlFor="pr-code">Code</label><input id="pr-code" name="code" className="field uppercase" required placeholder="SUMMER20" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="pr-type">Type</label><select id="pr-type" name="type" className="field"><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></div>
        <div><label className="label" htmlFor="pr-value">Value</label><input id="pr-value" name="value" type="number" inputMode="numeric" min={1} className="field" required /></div>
        <div><label className="label" htmlFor="pr-exp">Expiry (optional)</label><input id="pr-exp" name="expiresAt" type="date" className="field" /></div>
        <div><label className="label" htmlFor="pr-lim">Usage limit (optional)</label><input id="pr-lim" name="usageLimit" type="number" inputMode="numeric" min={1} className="field" /></div>
      </div>
      <div><label className="label" htmlFor="pr-min">Minimum order (EGP)</label><input id="pr-min" name="minSubtotal" type="number" inputMode="numeric" min={0} defaultValue={0} className="field" /></div>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="firstOrderOnly" className="size-[18px] accent-white" />First order only</label>
      {state?.error && <p className="error-text" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success" role="status">Code created.</p>}
      <button className="btn btn-primary w-full" disabled={pending}>Create code</button>
    </form>
  );
}
