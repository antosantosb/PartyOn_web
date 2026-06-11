export const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  console.error('VITE_API_URL is not defined!');
}

export function getCleanImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  let clean = url;
  if (clean.includes('localhost:3000')) {
    clean = clean.replace('localhost:3000', `${window.location.hostname}:3000`);
  }
  if (clean.includes('127.0.0.1:3000')) {
    clean = clean.replace('127.0.0.1:3000', `${window.location.hostname}:3000`);
  }
  return clean;
}
