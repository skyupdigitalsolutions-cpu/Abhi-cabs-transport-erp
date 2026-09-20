/** Merge conditional class names without extra dependencies. */
export function cn(...parts) {
  return parts
    .flat(Infinity)
    .filter(Boolean)
    .join(' ');
}
