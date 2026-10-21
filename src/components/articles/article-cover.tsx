import { articleCoverSrc } from './covers';

export function ArticleCover({ slug, src, className = '', priority }: { slug: string; src: string; className?: string; priority?: boolean }) {
  return <img alt="" className={`article-cover ${className}`.trim()} fetchPriority={priority ? 'high' : undefined} height="360" src={articleCoverSrc(slug, src)} width="640" />;
}
