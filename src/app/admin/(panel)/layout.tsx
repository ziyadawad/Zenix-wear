import { requireAdmin } from '@/lib/auth';
import { AdminNav } from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="lg:grid lg:min-h-svh lg:grid-cols-[230px_1fr]">
      <AdminNav />
      <main className="min-w-0 px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+88px)] md:px-8 md:py-8 lg:pb-10">{children}</main>
    </div>
  );
}
