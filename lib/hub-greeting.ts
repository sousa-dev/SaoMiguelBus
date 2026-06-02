/** i18n key for time-of-day greeting on the hub hero. */
export function hubGreetingKey(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) {
    return 'hubGreetingMorning';
  }
  if (hour < 18) {
    return 'hubGreetingAfternoon';
  }
  return 'hubGreetingEvening';
}
