import { describe, expect, it } from "vitest";
import { formatMinutes, getWeekdays, minutesBetween } from "./time";

describe("time helpers", () => {
  it("calcula a duração e o saldo de nove horas", () => {
    expect(minutesBetween("08:00", "17:00")).toBe(540);
    expect(minutesBetween("08:00", "16:00")).toBe(480);
    expect(formatMinutes(-60, true)).toBe("−1h00");
  });

  it("não aceita término anterior ao início", () => {
    expect(minutesBetween("17:00", "08:00")).toBeNull();
  });

  it("gera somente dias úteis", () => {
    const days = getWeekdays(2026, 9);
    expect(days).toHaveLength(22);
    expect(days.every((day) => !["sábado", "domingo"].includes(day.weekday))).toBe(true);
  });
});
