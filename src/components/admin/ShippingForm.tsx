'use client';
import { useState, useTransition } from 'react';
import { saveShipping } from '@/app/admin/actions';

export function ShippingForm({ rates }: { rates: { id: string; name_en: string; name_ar: string; fee: number }[] }) {
  const [fees, setFees] = useState(() => Object.fromEntries(rates.map((r) => [r.id, r.fee])));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="pb-16" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveShipping(fees); setMsg(r.ok ? 'Saved' : 'Could not save. Check the amounts.'); }); }}>
      <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
        {rates.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 bg-surface p-3">
            <label htmlFor={`s-${r.id}`} className="min-w-0 text-sm">{r.name_en}<span className="block text-xs text-muted" dir="rtl">{r.name_ar}</span></label>
            <input id={`s-${r.id}`} type="number" inputMode="numeric" min={0} className="field !min-h-11 !w-24 !py-1 text-center" value={fees[r.id]} onChange={(e) => { setFees({ ...fees, [r.id]: Math.max(0, Number(e.target.value) || 0) }); setMsg(null); }} />
          </li>
        ))}
      </ul>
      <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 flex items-center justify-end gap-3 border-t border-line bg-black/95 p-2.5 lg:bottom-0 lg:start-[230px]">
        {msg && <p role="status" className={msg === 'Saved' ? 'text-sm text-success' : 'text-sm text-[#ff9a9d]'}>{msg}</p>}
        <button className="btn btn-primary !min-h-11" disabled={pending}>Save fees</button>
      </div>
    </form>
  );
}
