import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/db/seed';
import { blobConfigured, emailConfigured, paymobEnabled } from '@/lib/services';
import type { SiteSettings } from '@/lib/types';
import { Card, PageHead } from '@/components/admin/ui';
import { SettingsForm } from '@/components/admin/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin();
  const [row] = await db.query(`SELECT value FROM settings WHERE key = 'site'`);
  const settings = { ...DEFAULT_SETTINGS, ...(row?.value as Partial<SiteSettings> | undefined) };
  const [{ demo }] = await db.query(`SELECT count(*)::int AS demo FROM reviews WHERE is_demo = true`);
  const checks: { ok: boolean; label: string }[] = [
    { ok: !!process.env.DATABASE_URL, label: 'Production database connected (DATABASE_URL)' },
    { ok: (process.env.DASHBOARD_SESSION_SECRET?.length ?? 0) >= 32, label: 'Dashboard login secured (DASHBOARD_PASSWORD, DASHBOARD_SESSION_SECRET)' },
    { ok: blobConfigured(), label: 'Image storage connected (Vercel Blob)' },
    { ok: emailConfigured(), label: 'New-order emails switched on (RESEND_API_KEY)' },
    { ok: (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://'), label: 'Live domain set (NEXT_PUBLIC_SITE_URL)' },
    { ok: demo === 0, label: `Sample reviews removed (${demo} left, see Reviews)` },
    { ok: !!(settings.instagram || settings.tiktok || settings.facebook), label: 'Social links added (below)' },
    { ok: paymobEnabled(), label: 'Card payments connected (Paymob, optional)' },
  ];
  return (
    <>
      <PageHead title="Settings" />
      <Card title="Launch checklist" className="mb-4">
        <ul className="space-y-2.5 text-sm">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2.5">
              {c.ok ? <CheckCircle2 size={17} strokeWidth={1.25} className="mt-0.5 flex-none text-success" /> : <AlertTriangle size={17} strokeWidth={1.25} className="mt-0.5 flex-none text-[#e9bd67]" />}
              <span className={c.ok ? 'text-muted' : ''}>{c.label}</span>
            </li>
          ))}
        </ul>
      </Card>
      <SettingsForm initial={settings} />
    </>
  );
}
