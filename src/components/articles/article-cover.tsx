'use client';

import { useState } from 'react';

// ponytail: /images/articles/<category>.svg arrive with ticket 48; until then hero.webp stands in. Drop onError then.
export function ArticleCover({ src, className = '' }: { src: string; className?: string }) {
  const [image, setImage] = useState(src);
  return <img alt="" className={`article-cover ${className}`.trim()} height="360" onError={() => setImage('/images/hero.webp')} src={image} width="640" />;
}
