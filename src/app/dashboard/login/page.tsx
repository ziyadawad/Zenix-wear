import { redirect } from 'next/navigation';
import Image from 'next/image';
import { isAdmin } from '@/lib/auth';
import { ownerLoginConfigured } from '@/lib/session';
import { DashboardLoginForm } from '@/components/dashboard/LoginForm';

export const dynamic = 'force-dynamic';

export default async function DashboardLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await isAdmin()) redirect('/dashboard');
  const { next = '' } = await searchParams;
  return (
    <main className="flex min-h-svh items-center justify-center bg-black p-4" style={{ background: 'radial-gradient(70% 60% at 50% 35%, #232323 0%, #0a0a0a 60%, #000 100%)' }}>
      <div className="w-full max-w-[360px]">
        <Image src="/brand/logo-icon-full.webp" alt="ZENIX WEAR" width={220} height={220} priority className="mx-auto h-auto w-[150px]" />
        <h1 className="mt-6 text-center text-lg font-medium">داش بورد ZENIX</h1>
        {ownerLoginConfigured()
          ? <DashboardLoginForm next={next} />
          : <p role="alert" className="mt-6 border border-[#e5484d]/60 p-4 text-sm text-[#ff8a8e]">الداش بورد لسه متظبطش. ضيف DASHBOARD_PASSWORD و DASHBOARD_SESSION_SECRET في Vercel ← Environment Variables، وبعدين اعمل Redeploy.</p>}
      </div>
    </main>
  );
}
