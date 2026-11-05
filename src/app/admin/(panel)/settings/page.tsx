import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/db/seed';
import type { SiteSettings } from '@/lib/types';
import { PageHead } from '@/components/admin/ui';
import { SettingsForm } from '@/components/admin/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin();
  const [row] = await db.query(`SELECT value FROM settings WHERE key = 'site'`);
  return (
    <>
      <PageHead title="Settings" />
      <SettingsForm initial={{ ...DEFAULT_SETTINGS, ...(row?.value as Partial<SiteSettings> | undefined) }} />
    </>
  );
}
