// Shared Persian date-time helpers
// Uses persian-date to format timestamps in true Persian calendar formatting

import persianDate from 'persian-date';

const DEFAULT_FORMAT = 'YYYY/MM/DD HH:mm:ss';

export function nowPersian(format: string = DEFAULT_FORMAT): string {
  return new persianDate().format(format);
}

export function addHoursPersian(hours: number, format: string = DEFAULT_FORMAT): string {
  return new persianDate().add(hours, 'hours').format(format);
}

export function addDaysPersian(days: number, format: string = DEFAULT_FORMAT): string {
  return new persianDate().add(days, 'day').format(format);
}
