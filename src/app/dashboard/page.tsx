import { requireAdmin } from '@/lib/auth';
import { DashboardApp } from '@/components/dashboard/App';
import { ownerLogout } from './actions';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  await requireAdmin();
  return <DashboardApp logout={ownerLogout} />;
}
