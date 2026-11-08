'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { changeOrderStatus, deletePromo, deleteProduct, deleteReview, deleteStockAlert, markMessageRead, moderateReview, removeDemoReviews, setPaymentStatus, togglePromo } from '@/app/admin/actions';
import { ORDER_STATUSES } from '@/lib/types';
import { cx } from '@/lib/utils';

export function RemoveDemoButton() {
  const [pending, start] = useTransition();
  return <button className="btn btn-ghost !min-h-11 w-full" disabled={pending} onClick={() => { if (confirm('Delete all sample reviews? This cannot be undone.')) start(() => removeDemoReviews()); }}>Remove sample reviews</button>;
}
export function DeleteProductButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm text-[#ff9a9d]" disabled={pending} onClick={() => { if (confirm('Delete this product for good? Past orders keep their details.')) start(() => deleteProduct(id)); }}><Trash2 size={15} strokeWidth={1.25} />Delete product</button>;
}
export function OrderStatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {ORDER_STATUSES.map((s) => (
          <button key={s} disabled={pending || s === status} aria-pressed={s === status} onClick={() => {
            if ((s === 'cancelled' || s === 'returned') && !confirm(`Mark this order as ${s}? Its items go back into stock.`)) return;
            setError(null);
            start(async () => { const r = await changeOrderStatus(id, s); if (r.ok) router.refresh(); else setError(r.error ?? 'Could not update.'); });
          }} className={cx('min-h-12 border px-2 text-sm capitalize transition-colors', s === status ? 'border-white bg-white text-black' : 'border-line-strong hover:border-white')}>{s}</button>
        ))}
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}
export function PaymentToggle({ id, paid }: { id: string; paid: boolean }) {
  const [pending, start] = useTransition();
  return <button className="btn btn-ghost !min-h-11 w-full" disabled={pending} onClick={() => start(() => setPaymentStatus(id, paid ? 'unpaid' : 'paid'))}>{paid ? 'Mark as unpaid' : 'Mark as paid'}</button>;
}
export function PromoRowActions({ code, active }: { code: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-3 text-xs">
      <button className="min-h-11 underline" disabled={pending} onClick={() => start(() => togglePromo(code, !active))}>{active ? 'Disable' : 'Enable'}</button>
      <button className="min-h-11 text-[#ff9a9d] underline" disabled={pending} onClick={() => { if (confirm(`Delete ${code}?`)) start(() => deletePromo(code)); }}>Delete</button>
    </div>
  );
}
export function ReviewActions({ id, status, onHome }: { id: string; status: string; onHome: boolean }) {
  const [pending, start] = useTransition();
  const b = 'min-h-11 border border-line-strong px-3 text-xs hover:border-white';
  return (
    <div className="flex flex-wrap gap-1.5">
      {status !== 'approved' && <button className={b} disabled={pending} onClick={() => start(() => moderateReview(id, { status: 'approved' }))}>Approve</button>}
      {status !== 'rejected' && <button className={b} disabled={pending} onClick={() => start(() => moderateReview(id, { status: 'rejected', onHome: false }))}>Hide</button>}
      {status === 'approved' && <button className={b} disabled={pending} onClick={() => start(() => moderateReview(id, { onHome: !onHome }))}>{onHome ? 'Remove from homepage' : 'Show on homepage'}</button>}
      <button className={`${b} text-[#ff9a9d]`} disabled={pending} onClick={() => { if (confirm('Delete this review?')) start(() => deleteReview(id)); }}>Delete</button>
    </div>
  );
}
export function MarkReadButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button className="min-h-11 text-xs underline" disabled={pending} onClick={() => start(() => markMessageRead(id))}>Mark as read</button>;
}
export function DeleteAlertButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button className="min-h-11 text-xs underline" disabled={pending} onClick={() => start(() => deleteStockAlert(id))}>Done</button>;
}
