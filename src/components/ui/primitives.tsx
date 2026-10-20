import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { BadgeCheck, Inbox, Star } from 'lucide-react';

/** Shared props for decorative lucide icons: `<MapPin {...icon} />`, `<Bell {...iconLg} />`. */
export const icon = { 'aria-hidden': true, size: 16, strokeWidth: 1.75 } as const;
export const iconLg = { ...icon, size: 20 } as const;

export function Button({ variant = 'primary', size, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'danger'; size?: 'small' }) {
  return <button className={`button button-${variant}${size ? ` button-${size}` : ''} ${className}`.trim()} {...props} />;
}

export function Card({ children, className = '', as: Element = 'div', ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <Element className={`surface-card ${className}`.trim()} {...props}>{children}</Element>;
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`text-input ${className}`.trim()} {...props} />;
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`text-input select-input ${className}`.trim()} {...props} />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = '',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`page-heading shared-page-header ${className}`.trim()}>
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="shared-page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function StatCard({ label, value, detail, icon }: { label: string; value: ReactNode; detail?: string; icon?: ReactNode }) {
  return (
    <article className="shared-stat-card">
      {icon ? <span aria-hidden="true" className="shared-stat-icon">{icon}</span> : null}
      <div className="shared-stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}

export function EmptyState({ title, description, action, icon = <Inbox {...iconLg} /> }: { title: string; description: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <section className="shared-empty-state">
      <span aria-hidden="true" className="shared-empty-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div className="shared-empty-action">{action}</div> : null}
    </section>
  );
}

export function VerifiedCheck() {
  return <span aria-label="Công ty đã xác minh" className="verified-check" role="img"><BadgeCheck {...icon} /></span>;
}

export function FeaturedBadge() {
  return <span className="featured-badge"><Star {...icon} size={12} />Nổi bật</span>;
}
