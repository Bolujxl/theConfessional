export function formatTimestamp(timestamp: number, now: number): string {
  const diff = now - timestamp;
  const mins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} mins ago`;
  return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
}
