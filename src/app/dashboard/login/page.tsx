import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { ownerLoginConfigured } from '@/lib/session';
import { tr } from '@/lib/dashboard/lang';
import { dashLang } from '@/lib/dashboard/server-lang';
import { DashboardLoginForm } from '@/components/dashboard/LoginForm';
import { LangToggle } from '@/components/dashboard/LangToggle';
import { OrbitMark } from '@/components/home/Bits';

export const dynamic = 'force-dynamic';

export default async function DashboardLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await isAdmin()) redirect('/dashboard');
  const { next = '' } = await searchParams;
  const lang = await dashLang();
  const t = (ar: string, en: string) => tr(lang, ar, en);
  return (
    <main className="dash-login relative flex min-h-svh items-center justify-center p-4">
      <div className="absolute end-4 top-4"><LangToggle lang={lang} /></div>
      <div className="w-full max-w-[360px]">
        {/* Same turning Z and ring as the homepage hero (stops with reduced motion). */}
        <div className="logo-glow mx-auto w-[170px]"><OrbitMark hero sizes="170px" /></div>
        <h1 className="mt-6 text-center text-lg font-medium">{t('داش بورد ZENIX', 'ZENIX Dashboard')}</h1>
        {ownerLoginConfigured()
          ? <DashboardLoginForm next={next} lang={lang} />
          : <p role="alert" className="mt-6 border border-[#e5484d]/60 p-4 text-sm text-[#ff8a8e]">{t('الداش بورد لسه متظبطتش. ضيف DASHBOARD_PASSWORD و DASHBOARD_SESSION_SECRET في Vercel ← Settings ← Environment Variables، وبعدين اعمل Redeploy.', 'The dashboard is not set up yet. Add DASHBOARD_PASSWORD and DASHBOARD_SESSION_SECRET in Vercel → Settings → Environment Variables, then redeploy.')}</p>}
      </div>
    </main>
  );
}
