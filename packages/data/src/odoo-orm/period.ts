import { validDateRange } from '@el-dabboos/domain';

function utcBoundary(day: string, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const desired = Date.parse(`${day}T00:00:00Z`);
  let instant = desired;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
    const represented = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
    const correction = desired - represented;
    if (!correction) return new Date(instant).toISOString().slice(0, 19).replace('T', ' ');
    instant += correction;
  }
  throw new Error('Unsupported Odoo ORM calendar boundary');
}

export function odooOrmPeriod(from: string, to: string, timeZone: string) {
  if (!validDateRange({ from, to }) || Date.parse(to) - Date.parse(from) > 366 * 86400000) throw new Error('Bounded Odoo ORM period required');
  const nextDay = new Date(Date.parse(to) + 86400000).toISOString().slice(0, 10);
  return { from, to, orderFrom: utcBoundary(from, timeZone), orderBefore: utcBoundary(nextDay, timeZone) };
}
