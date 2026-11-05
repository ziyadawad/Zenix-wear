import type { Metadata } from 'next';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getSettings } from '@/lib/catalog';
import type { Locale } from '@/lib/types';
import { CONTACT } from '@/lib/utils';
import { ContactForm } from '@/components/ui/ContactForm';
import { SocialLinks } from '@/components/layout/SocialLinks';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return { title: t.nav.contact, description: t.contact.intro, alternates: { canonical: `/${locale}/contact`, languages: { ar: '/ar/contact', en: '/en/contact' } } };
}

export default async function Contact({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale).contact;
  const settings = await getSettings();
  const row = 'flex items-center gap-4 border-b border-line py-5 hover:opacity-70 transition-opacity';
  return (
    <div className="container-zx mx-auto grid max-w-[1200px] gap-12 py-12 md:grid-cols-2 md:gap-20 md:py-20">
      <div>
        <h1 className="display text-[clamp(2rem,4.8vw,3.8rem)]">{t.title}</h1>
        <p className="mt-5 max-w-[46ch] leading-[1.9] text-silver">{t.intro}</p>
        <div className="mt-10 border-t border-line">
          <a className={row} href={CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} strokeWidth={1.25} /><span className="flex-1">{t.whatsapp}</span><span className="text-muted" dir="ltr">{CONTACT.phone}</span></a>
          <a className={row} href={`tel:${CONTACT.phone}`}><Phone size={20} strokeWidth={1.25} /><span className="flex-1">{t.callUs}</span><span className="text-muted" dir="ltr">{CONTACT.phone}</span></a>
          <a className={row} href={`mailto:${CONTACT.email}`}><Mail size={20} strokeWidth={1.25} /><span className="flex-1">{t.emailUs}</span><span className="min-w-0 break-all text-sm text-muted" dir="ltr">{CONTACT.email}</span></a>
        </div>
        <div className="mt-6 flex items-center gap-3"><span className="text-sm text-muted">{t.follow}</span><SocialLinks settings={settings} locale={locale} /></div>
        <p className="mt-6 text-sm text-muted">{t.online}</p>
      </div>
      <ContactForm />
    </div>
  );
}
