import { requireAdmin } from '@/lib/auth';
import { dashLang } from '@/lib/dashboard/server-lang';
import { DashboardApp } from '@/components/dashboard/App';
import { ownerLogout } from './actions';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  await requireAdmin();
  return <DashboardApp logout={ownerLogout} lang={await dashLang()} />;
}
