'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Boxes, ExternalLink, LayoutDashboard, LogOut, Maximize, RefreshCw, Settings, Shirt, ShoppingCart, Users, Wallet } from 'lucide-react';
import type { DashLang } from '@/lib/dashboard/lang';
import { L, setDashLang } from './i18n';
import { LangToggle } from './LangToggle';
import { DASHBOARD_CONFIG as C } from '../../../config/dashboard.config';
import { Panel, hhmm, num } from './ui';
import { OverviewPage } from './pages/Overview';
import { OrdersPage } from './pages/Orders';
import { StockPage } from './pages/Stock';
import { MoneyPage } from './pages/Money';
import { ProductsPage } from './pages/Products';
import { CustomersPage } from './pages/Customers';

const ICONS = { LayoutDashboard, ShoppingCart, Boxes, Wallet, Shirt, Users } as const;
const PAGES = { overview: OverviewPage, orders: OrdersPage, stock: StockPage, money: MoneyPage, products: ProductsPage, customers: CustomersPage } as const;
type PageId = keyof typeof PAGES;

// ---- Shared context: the details panel and page switching ----------------------------------------
interface Shell { open: (title: string, body: React.ReactNode) => void; close: () => void; go: (page: PageId) => void }
const ShellCtx = createContext<Shell>({ open: () => {}, close: () => {}, go: () => {} });
export const useShell = () => useContext(ShellCtx);

export function DashboardApp({ logout, lang }: { logout: () => Promise<void>; lang: DashLang }) {
  // Before any child renders: every label and number format reads this.
  setDashLang(lang);
  const pages = C.pages.filter((p) => p.enabled).sort((a, b) => a.order - b.order);
  const [page, setPage] = useState<PageId>(pages[0].id as PageId);
  const [panel, setPanel] = useState<{ title: string; body: React.ReactNode } | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [tv, setTv] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);

  // Remember the open tab in the URL hash, so a refresh or a shared bookmark lands on the same page.
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h in PAGES && pages.some((p) => p.id === h)) setPage(h as PageId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const on = (e: Event) => setUpdated((e as CustomEvent<string>).detail);
    window.addEventListener('dash:updated', on);
    return () => window.removeEventListener('dash:updated', on);
  }, []);
  const go = useCallback((p: PageId) => { setPage(p); history.replaceState(null, '', `#${p}`); }, []);
  useEffect(() => { tabs.current?.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }, [page]);

  const step = useCallback((dir: 1 | -1) => {
    const i = pages.findIndex((p) => p.id === page);
    go(pages[(i + dir + pages.length) % pages.length].id as PageId);
  }, [page, pages, go]);

  // ---- TV mode: fullscreen, pages rotate on their own, keyboard arrows move, Esc or F leaves ---------
  const exitTv = useCallback(() => { setTv(false); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }, []);
  const enterTv = useCallback(() => { setPanel(null); setTv(true); root.current?.requestFullscreen?.().catch(() => {}); }, []);
  useEffect(() => {
    if (!tv) return;
    const id = setInterval(() => step(1), C.tvRotateSeconds * 1000);
    return () => clearInterval(id);
  }, [tv, step]);
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setTv(false); };
    const onKey = (e: KeyboardEvent) => {
      if (panel || (e.target as HTMLElement)?.closest?.('input,textarea,select')) return;
      if (e.key === 'f' || e.key === 'F' || e.key === 'ب') { e.preventDefault(); if (tv) exitTv(); else enterTv(); }
      else if (tv && e.key === 'Escape') exitTv();
      else if (tv && e.key === 'ArrowLeft') step(lang === 'en' ? -1 : 1); // RTL: left = next
      else if (tv && e.key === 'ArrowRight') step(lang === 'en' ? 1 : -1);
    };
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('fullscreenchange', onFs); window.removeEventListener('keydown', onKey); };
  }, [tv, panel, step, enterTv, exitTv, lang]);

  const shell: Shell = {
    open: useCallback((title: string, body: React.ReactNode) => setPanel({ title, body }), []),
    close: useCallback(() => setPanel(null), []),
    go,
  };
  const Current = PAGES[page];
  const cur = pages.find((p) => p.id === page);
  const title = cur ? L(cur.title, cur.titleEn) : '';
  const updatedText = `${L('آخر تحديث', 'Updated')}: ${updated ? hhmm(updated) : '…'}`;

  return (
    <ShellCtx.Provider value={shell}>
      <div ref={root} className={`dash-app min-h-svh overflow-x-clip ${tv ? 'overflow-y-auto' : ''}`}>
        <header className="dash-headbar sticky top-0 z-40">
          <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Image src="/brand/wordmark.webp" alt="ZENIX WEAR" width={592} height={56} priority className="h-auto w-[112px] md:w-[150px]" />
              <span className="hidden text-[13px] text-muted sm:inline">{L('داش بورد', 'Dashboard')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="dash-pill dash-pill-quiet me-1 !hidden !cursor-default lg:!inline-flex" aria-live="polite"><span className="dash-live" aria-hidden="true" />{updatedText}</span>
              <LangToggle lang={lang} />
              <button type="button" onClick={() => window.dispatchEvent(new Event('dash:refresh'))} aria-label={L('حدّث دلوقتي', 'Refresh now')} title={L('حدّث دلوقتي', 'Refresh now')} className="dash-pill !px-0"><RefreshCw size={16} /></button>
              {tv ? (
                <button type="button" onClick={exitTv} className="dash-pill">{L('اخرج من وضع الشاشة', 'Exit TV mode')}</button>
              ) : (
                <>
                  <button type="button" onClick={enterTv} className="dash-pill !hidden md:!inline-flex"><Maximize size={14} />{L('وضع الشاشة', 'TV mode')}</button>
                  <a href="/admin/orders" className="dash-pill dash-pill-quiet !px-0" aria-label={L('الإدارة: المنتجات والمحتوى', 'Admin: products and content')} title={L('الإدارة', 'Admin')}><Settings size={16} /></a>
                  <form action={logout}><button className="dash-pill dash-pill-quiet" aria-label={L('خروج', 'Log out')}><LogOut size={15} className="flip-rtl" /><span className="hidden sm:inline">{L('خروج', 'Log out')}</span></button></form>
                </>
              )}
            </div>
          </div>
          <div className="mx-auto max-w-[1500px] md:px-4">
            <div ref={tabs} role="tablist" aria-label={L('صفحات الداش بورد', 'Dashboard pages')} className="no-scrollbar flex gap-1 overflow-x-auto px-2 md:px-0">
              {pages.map((p) => {
                const Icon = ICONS[p.icon as keyof typeof ICONS];
                const on = p.id === page;
                return (
                  <button key={p.id} role="tab" aria-selected={on} type="button" onClick={() => go(p.id as PageId)}
                    className="dash-tab -mb-px flex min-h-12 flex-none items-center gap-2 px-4 text-[14px] transition-colors">
                    <Icon size={16} strokeWidth={1.5} aria-hidden="true" />{L(p.title, p.titleEn)}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+40px)] md:px-6 md:py-6">
          <div className="mb-4 flex items-center justify-between gap-3 md:mb-6">
            <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
            <span className="dash-pill dash-pill-quiet !h-8 !cursor-default lg:!hidden"><span className="dash-live" aria-hidden="true" />{updatedText}</span>
          </div>
          <Current key={page} />
          {!tv && (
            <p className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-[12px] text-muted">
              <span>{L(`بيتحدث لوحده كل ${num(C.refreshSeconds)} ثانية · المواعيد بتوقيت القاهرة`, `Refreshes every ${C.refreshSeconds} seconds · Cairo time`)}</span>
              <a href="/" target="_blank" className="inline-flex items-center gap-1 underline underline-offset-4"><ExternalLink size={12} />{L('افتح الموقع', 'Open the site')}</a>
            </p>
          )}
        </main>

        {panel && <Panel title={panel.title} onClose={shell.close}>{panel.body}</Panel>}
      </div>
    </ShellCtx.Provider>
  );
}
