const vietnamOffset = 7 * 60 * 60 * 1000;

// datetime-local is a wall clock value; parse it without the browser's timezone.
export function vietnamInputToIso(value: string): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('Ngày giờ chưa hợp lệ.');
  const [, year, month, day, hour, minute] = match.map(Number);
  const utc = Date.UTC(year, month - 1, day, hour, minute);
  const date = new Date(utc);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute) throw new Error('Ngày giờ chưa hợp lệ.');
  return new Date(utc - vietnamOffset).toISOString();
}

export function isoToVietnamInput(value?: string | null): string {
  if (!value) return '';
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time + vietnamOffset).toISOString().slice(0, 16) : '';
}

export function vietnamDateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
}
