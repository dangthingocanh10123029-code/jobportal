import { Star } from 'lucide-react';
import { icon } from '@/components/ui/primitives';
export const formatRating = (value: number) => value.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Five stars, the first round(value) filled; read out as "4,5 trên 5 sao". */
export function Stars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const filled = Math.round(value);
  return (
    <span aria-label={`${formatRating(value)} trên 5 sao`} className={`review-stars review-stars-${size}`} role="img">
      {[1, 2, 3, 4, 5].map((star) => <Star {...icon} className={star <= filled ? 'is-filled' : undefined} fill="currentColor" key={star} />)}
    </span>
  );
}
