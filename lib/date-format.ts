/** App-wide calendar dates: DD/MM/YYYY (locale-independent). */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

/** Format YYYY-MM-DD or any parseable date/time as DD/MM/YYYY. */
export function formatAppDate(value: string | Date): string {
  if (typeof value === 'string') {
    const iso = ISO_DATE.exec(value.trim());
    if (iso) {
      return `${iso[3]}/${iso[2]}/${iso[1]}`;
    }
  }
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) {
    return typeof value === 'string' ? value : '';
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
