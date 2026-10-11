/** Convert a company-local date/time control value to an offset-bearing ISO timestamp. */
export function companyDateTimeToIso(value: string, timezone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('Choose a valid expiry date and time.');
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const wall = Date.UTC(year!, month! - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const parts = (instant: number) => Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
  let instant = wall;
  for (let attempt = 0; attempt < 3; attempt++) {
    const local = parts(instant);
    const shown = Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day), Number(local.hour), Number(local.minute));
    instant += wall - shown;
  }
  const final = parts(instant);
  if (`${final.year}-${final.month}-${final.day}T${final.hour}:${final.minute}` !== value) {
    throw new Error('This time does not exist in the selected company timezone. Choose another time.');
  }
  const offset = Math.round((wall - instant) / 60000);
  const sign = offset < 0 ? '-' : '+';
  const absolute = Math.abs(offset);
  return `${value}:00${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

export function isoToCompanyDateTime(value: string, timezone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
