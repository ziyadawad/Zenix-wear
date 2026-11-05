import type { Metadata } from 'next';
import { FAQ } from '@/lib/i18n/legal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/types';
import { jsonLd } from '@/lib/utils';
import { Accordion } from '@/components/ui/Accordion';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(locale).nav.faq, alternates: { canonical: `/${locale}/faq`, languages: { ar: '/ar/faq', en: '/en/faq' } } };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const items = FAQ[locale];
  return (
    <div className="container-zx mx-auto max-w-[820px] py-12 md:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }) }} />
      <h1 className="display mb-10 text-[clamp(1.9rem,4.2vw,3.4rem)]">{getDictionary(locale).nav.faq}</h1>
      <div className="border-t border-line">
        {items.map(([q, a]) => <Accordion key={q} title={q}><p className="pb-5 leading-[1.9] text-[#c8c8c8]">{a}</p></Accordion>)}
      </div>
    </div>
  );
}
