import Link from 'next/link';
import type { CompanySummary } from '@/actions/types';
import { shortCompanyName } from '@/components/format';

function Logos({ companies, copy }: { companies: CompanySummary[]; copy?: boolean }) {
  return companies.map((company) => (
    <li aria-hidden={copy || undefined} className={copy ? 'logo-strip-copy' : undefined} key={company.id}>
      <Link aria-label={company.name} className="logo-strip-item" href={`/companies/${company.id}`} prefetch={false} tabIndex={copy ? -1 : undefined}>
        <img alt="" height="40" src={company.logoUrl ?? '/images/company-placeholder.svg'} width="40" />
        <span>{shortCompanyName(company.name)}</span>
      </Link>
    </li>
  ));
}

/** Companies with open postings. On mobile the row runs as a slow marquee, so it is rendered twice (copy hidden from AT). */
export function LogoStrip({ companies }: { companies: CompanySummary[] }) {
  if (!companies.length) return null;
  return (
    <section aria-labelledby="logo-strip-title" className="logo-strip">
      <h2 className="logo-strip-title" id="logo-strip-title">Được tin dùng bởi các nhà tuyển dụng</h2>
      <div className="logo-strip-viewport">
        <ul className="logo-strip-track">
          <Logos companies={companies} />
          <Logos companies={companies} copy />
        </ul>
      </div>
    </section>
  );
}
