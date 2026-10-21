'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { icon } from '@/components/ui/primitives';

/** "Vừa lên bảng tin" row: the arrows scroll by one card and disable at either end. */
export function FreshCarousel({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = () => {
    const el = ref.current;
    if (el) setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
  };
  useEffect(update, []);

  const scroll = (direction: 1 | -1) => {
    const card = ref.current?.querySelector('li');
    ref.current?.scrollBy({ left: direction * (card ? card.offsetWidth + 16 : 280), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return (
    <>
      <div className="carousel-head">
        {heading}
        <div className="carousel-buttons">
          <button aria-label="Cuộn trái" className="carousel-button" disabled={edges.start} onClick={() => scroll(-1)} type="button"><ChevronLeft {...icon} size={18} /></button>
          <button aria-label="Cuộn phải" className="carousel-button" disabled={edges.end} onClick={() => scroll(1)} type="button"><ChevronRight {...icon} size={18} /></button>
        </div>
      </div>
      <ul className="fresh-scroller" onScroll={update} ref={ref}>{children}</ul>
    </>
  );
}
