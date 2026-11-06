const calendarDateFormatter = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatCalendarDate(date: string) {
  return calendarDateFormatter.format(new Date(`${date}T00:00:00.000Z`));
}
