'use client';
import { useState, useTransition } from 'react';
import { saveSettings } from '@/app/admin/actions';
import type { SiteSettings } from '@/lib/types';
import { Card } from './ui';

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const input = (k: Exclude<keyof SiteSettings, 'freeShippingThreshold'>, label: string, hint?: string, ph?: string) => (
    <div>
      <label className="label" htmlFor={`st-${k}`}>{label}</label>
      <input id={`st-${k}`} className="field" dir="ltr" placeholder={ph} value={v[k]} onChange={(e) => { setV({ ...v, [k]: e.target.value }); setMsg(null); }} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
  return (
    <form className="grid max-w-[1000px] gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveSettings(v); setMsg(r.ok ? { ok: true, text: 'Saved. The site updates right away.' } : { ok: false, text: r.error ?? 'Could not save.' }); }); }}>
      <Card title="Shipping">
        <label className="label" htmlFor="st-free">Free shipping on orders over (EGP)</label>
        <input id="st-free" type="number" inputMode="numeric" min={0} className="field" value={v.freeShippingThreshold} onChange={(e) => setV({ ...v, freeShippingThreshold: Math.max(0, Number(e.target.value) || 0) })} />
        <p className="mt-2 text-xs text-muted">Remember to update the announcement bar text under Homepage if you change this.</p>
      </Card>
      <Card title="Payment accounts">
        <div className="space-y-3">
          {input('instapayHandle', 'InstaPay address or number', 'Shown to customers who pay by InstaPay.')}
          {input('walletNumber', 'Mobile wallet number', 'Shown to customers who pay by Vodafone Cash or another wallet.')}
        </div>
      </Card>
      <Card title="Social links">
        <div className="space-y-3">
          {input('instagram', 'Instagram', undefined, 'https://instagram.com/…')}
          {input('tiktok', 'TikTok', undefined, 'https://tiktok.com/@…')}
          {input('facebook', 'Facebook', undefined, 'https://facebook.com/…')}
        </div>
      </Card>
      <Card title="Tracking pixels">
        <div className="space-y-3">
          {input('metaPixelId', 'Facebook Pixel ID', undefined, '1234567890')}
          {input('tiktokPixelId', 'TikTok Pixel ID', undefined, 'C4A1B2…')}
          {input('gaId', 'Google Analytics ID', undefined, 'G-XXXXXXX')}
        </div>
      </Card>
      <div className="flex items-center gap-3 md:col-span-2">
        <button className="btn btn-primary" disabled={pending}>Save settings</button>
        {msg && <p role="status" className={msg.ok ? 'text-sm text-success' : 'text-sm text-[#ff9a9d]'}>{msg.text}</p>}
      </div>
    </form>
  );
}
