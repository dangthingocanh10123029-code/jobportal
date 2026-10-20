const AVATAR_COUNT = 12;

/** Stable default avatar for a user: same id always maps to the same /images/avatars/avatar-NN.svg. */
export function avatarFor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return `/images/avatars/avatar-${String((hash % AVATAR_COUNT) + 1).padStart(2, '0')}.svg`;
}
