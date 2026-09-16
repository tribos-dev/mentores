export const EXPECTED_MINUTES = 9 * 60;

export type Workday = {
  date: string;
  start: string;
  end: string;
};

export function minutesBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return null;
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return minutes >= 0 ? minutes : null;
}

export function formatMinutes(value: number, signed = false): string {
  const sign = value < 0 ? "−" : signed && value > 0 ? "+" : "";
  const absolute = Math.abs(value);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `${sign}${hours}h${String(minutes).padStart(2, "0")}`;
}

export function getWeekdays(year: number, month: number) {
  const days: Array<{ date: string; day: number; weekday: string; week: number }> = [];
  let week = 1;
  let hasDaysInWeek = false;
  const finalDay = new Date(year, month, 0).getDate();

  for (let day = 1; day <= finalDay; day += 1) {
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    if (weekday === 1 && hasDaysInWeek) week += 1;
    hasDaysInWeek = true;
    days.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date),
      week,
    });
  }
  return days;
}
