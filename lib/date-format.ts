/** App-wide calendar dates: DD/MM/YYYY (locale-independent). */

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

export function formatAppDate(value: string | Date): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export function formatAppDateTime(value: string | Date): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${formatAppDate(d)} ${hours}:${minutes}`;
}
