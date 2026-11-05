import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetForm } from '@/components/account/ResetForms';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false } };

export default function ResetPage() {
  return <div className="container-zx mx-auto max-w-[480px] py-12 md:py-20"><Suspense><ResetForm /></Suspense></div>;
}
