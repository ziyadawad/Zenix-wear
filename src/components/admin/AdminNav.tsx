'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ExternalLink, FolderTree, Inbox, LayoutTemplate, LogOut, Menu, Package, Settings, ShoppingCart, Star, TicketPercent, Truck, Users, X } from 'lucide-react';
import { ownerLogout } from '@/app/dashboard/actions';
import { cx } from '@/lib/utils';

const ALL = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/promos', label: 'Promo codes', icon: TicketPercent },
  { href: '/admin/shipping', label: 'Shipping fees', icon: Truck },
  { href: '/admin/content', label: 'Homepage', icon: LayoutTemplate },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/inbox', label: 'Inbox', icon: Inbox },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const active = (h: string) => pathname.startsWith(h);
  const item = (h: typeof ALL[number], onClick?: () => void) => (
    <Link key={h.href} href={h.href} onClick={onClick} aria-current={active(h.href) ? 'page' : undefined} className={cx('flex min-h-12 items-center gap-3 px-3 text-sm transition-colors', active(h.href) ? 'bg-raised text-white' : 'text-muted hover:text-white')}>
      <h.icon size={18} strokeWidth={1.25} />{h.label}
    </Link>
  );
  const footer = (
    <div className="mt-4 border-t border-line pt-3">
      <a href="/" target="_blank" className="flex min-h-12 items-center gap-3 px-3 text-sm text-muted hover:text-white"><ExternalLink size={18} strokeWidth={1.25} />View site</a>
      <form action={ownerLogout}><button className="flex min-h-12 w-full items-center gap-3 px-3 text-sm text-muted hover:text-white"><LogOut size={18} strokeWidth={1.25} />Sign out</button></form>
    </div>
  );
  return (
    <>
      <aside className="no-print sticky top-0 hidden h-svh flex-col overflow-y-auto border-e border-line bg-black p-4 lg:flex">
        <Link href="/dashboard" className="mb-6 block px-3 py-2"><Image src="/brand/wordmark.webp" alt="ZENIX WEAR" width={592} height={56} className="h-auto w-[150px]" /></Link>
        <nav className="flex-1 space-y-0.5" aria-label="Admin">{ALL.map((h) => item(h))}</nav>
        {footer}
      </aside>
      {/* Phone: the four daily tasks on a bottom bar, the rest under More */}
      <nav aria-label="Admin" className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-black pb-[env(safe-area-inset-bottom)] lg:hidden">
        {ALL.slice(0, 3).concat(ALL[7]).map((h) => (
          <Link key={h.href} href={h.href} aria-current={active(h.href) ? 'page' : undefined} className={cx('flex min-h-[60px] flex-col items-center justify-center gap-1 text-[10px]', active(h.href) ? 'text-white' : 'text-muted')}>
            <h.icon size={20} strokeWidth={1.25} />{h.label.split(' ')[0]}
          </Link>
        ))}
        <button onClick={() => setMore(true)} className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-[10px] text-muted"><Menu size={20} strokeWidth={1.25} />More</button>
      </nav>
      {more && (
        <>
          <div className="scrim" onClick={() => setMore(false)} aria-hidden="true" />
          <div className="sheet" role="dialog" aria-modal="true" aria-label="More">
            <div className="flex items-center justify-between border-b border-line px-4 py-1">
              <span className="eyebrow">Menu</span>
              <button className="icon-btn -me-3" aria-label="Close" onClick={() => setMore(false)}><X size={22} strokeWidth={1.25} /></button>
            </div>
            <div className="overflow-y-auto p-2 pb-[calc(env(safe-area-inset-bottom)+12px)]">{ALL.map((h) => item(h, () => setMore(false)))}{footer}</div>
          </div>
        </>
      )}
    </>
  );
}
