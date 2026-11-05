import type { Metadata } from 'next';
import { LEGAL, type LegalDoc } from '@/lib/i18n/legal';
import type { Locale } from '@/lib/types';

type Params = { params: Promise<{ locale: Locale }> };

function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <article className="container-zx mx-auto max-w-[820px] py-12 md:py-20">
      <h1 className="display text-[clamp(1.9rem,4.2vw,3.4rem)]">{doc.title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-silver">{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.h} className="mt-10 border-t border-line pt-7">
          <h2 className="text-base font-medium">{s.h}</h2>
          <div className="prose-zx mt-3 text-[15px]">{s.p.map((p) => <p key={p}>{p}</p>)}</div>
        </section>
      ))}
    </article>
  );
}

/** Each policy route needs only its key. */
export function legalRoute(key: string) {
  return {
    generateMetadata: async ({ params }: Params): Promise<Metadata> => {
      const { locale } = await params;
      const d = LEGAL[key][locale];
      return { title: d.title, description: d.intro, alternates: { canonical: `/${locale}/${key}`, languages: { ar: `/ar/${key}`, en: `/en/${key}` } } };
    },
    Page: async ({ params }: Params) => <LegalPage doc={LEGAL[key][(await params).locale]} />,
  };
}
