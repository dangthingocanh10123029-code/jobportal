import type { ReactNode } from 'react';

const count = (value: number) => value.toLocaleString('vi-VN');

/** Banner backdrop (gradient, blurred blobs, dot grid) around the hero content, plus the real totals row. */
export function HeroBanner({ children, openPostings, companies }: { children: ReactNode; openPostings: number; companies: number }) {
  return (
    <section aria-labelledby="home-title" className="home-hero">
      <span aria-hidden="true" className="hero-blob hero-blob-left" />
      <span aria-hidden="true" className="hero-blob hero-blob-right" />
      <div className="home-hero-content">
        {children}
        <p className="hero-stats"><span><strong>{count(openPostings)}</strong> việc làm</span><span aria-hidden="true">·</span><span><strong>{count(companies)}</strong> công ty</span></p>
      </div>
    </section>
  );
}
