import type { Metadata } from 'next';
import { ForgotForm } from '@/components/account/ResetForms';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false } };

export default function ForgotPage() {
  return <div className="container-zx mx-auto max-w-[480px] py-12 md:py-20"><ForgotForm /></div>;
}
