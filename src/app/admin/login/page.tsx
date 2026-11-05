import { redirect } from 'next/navigation';
import Image from 'next/image';
import { isAdmin } from '@/lib/auth';
import { LoginForm } from '@/components/admin/LoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLogin() {
  if (await isAdmin()) redirect('/admin');
  const configured = !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH);
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        <Image src="/brand/z-mark.webp" alt="ZENIX" width={110} height={68} className="mx-auto" />
        <h1 className="display mt-6 text-center text-xl">Owner sign in</h1>
        {configured ? <LoginForm /> : <p role="alert" className="mt-6 border border-danger/50 p-4 text-sm text-[#ff9a9d]">Admin login is not set up. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH (see README).</p>}
      </div>
    </div>
  );
}
