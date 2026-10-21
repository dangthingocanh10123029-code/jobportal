import Link from 'next/link';
import type { CompanySummary } from '@/actions/types';
import { partners } from './partners';

type Partner = (typeof partners)[number] & { id: string };

function Logos({ items, copy }: { items: Partner[]; copy?: boolean }) {
  return items.map((partner) => (
    <li aria-hidden={copy || undefined} className={copy ? 'logo-strip-copy' : undefined} key={partner.id}>
      <Link aria-label={partner.name} className="logo-strip-item" href={`/companies/${partner.id}`} prefetch={false} tabIndex={copy ? -1 : undefined} title={partner.name}>
        <img alt={`${partner.name} logo`} height="32" loading="lazy" src={partner.src} width={partner.width} />
      </Link>
    </li>
  ));
}

/** Partner wordmarks linked to their company page; a partner missing from `companies` is skipped (no dead links). On mobile the row runs as a slow marquee, so it is rendered twice (copy hidden from AT). */
export function LogoStrip({ companies }: { companies: CompanySummary[] }) {
  const ids = new Map(companies.map((company) => [company.name, company.id]));
  const items = partners.flatMap((partner) => {
    const id = ids.get(partner.name);
    return id ? [{ ...partner, id }] : [];
  });
  if (!items.length) return null;
  return (
    <section aria-labelledby="logo-strip-title" className="logo-strip">
      <h2 className="logo-strip-title" id="logo-strip-title">Được tin dùng bởi các nhà tuyển dụng</h2>
      <div className="logo-strip-viewport">
        <ul className="logo-strip-track">
          <Logos items={items} />
          <Logos copy items={items} />
        </ul>
      </div>
    </section>
  );
}
