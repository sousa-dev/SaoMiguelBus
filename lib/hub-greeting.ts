/** Hour-of-day in the Azores timezone, falling back to device hour. */
function azoresHour(date: Date): number {
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Atlantic/Azores',
    }).format(date);
    const hour = Number.parseInt(formatted, 10);
    return Number.isFinite(hour) ? hour % 24 : date.getHours();
  } catch {
    // Intl/timeZone unsupported on this runtime — use the device clock.
    return date.getHours();
  }
}

export type HubGreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function hubGreetingPeriod(date = new Date()): HubGreetingPeriod {
  const hour = azoresHour(date);
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 18) {
    return 'afternoon';
  }
  return 'evening';
}

/** i18n key for the time-of-day greeting, anchored to Azores wall-clock time. */
export function hubGreetingKey(date = new Date()): string {
  switch (hubGreetingPeriod(date)) {
    case 'morning':
      return 'hubGreetingMorning';
    case 'afternoon':
      return 'hubGreetingAfternoon';
    case 'evening':
      return 'hubGreetingEvening';
  }
}

export function hubGreetingEmoji(date = new Date()): string {
  switch (hubGreetingPeriod(date)) {
    case 'morning':
      return '🌅';
    case 'afternoon':
      return '☀️';
    case 'evening':
      return '🌙';
  }
}
