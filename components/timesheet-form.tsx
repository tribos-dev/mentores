"use client";

import { FormEvent, useMemo, useState } from "react";
import { EXPECTED_MINUTES, formatMinutes, getWeekdays, minutesBetween } from "@/lib/time";

type Entry = { start: string; end: string };
type Step = "form" | "review" | "success";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function TimesheetForm() {
  const now = new Date();
  const [name, setName] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [protocol, setProtocol] = useState("");

  const days = useMemo(() => getWeekdays(year, month), [year, month]);
  const groupedDays = useMemo(() => Map.groupBy(days, (day) => day.week), [days]);

  const summary = useMemo(() => {
    const completed = days.flatMap((day) => {
      const entry = entries[day.date];
      const minutes = minutesBetween(entry?.start ?? "", entry?.end ?? "");
      return minutes === null ? [] : [{ ...day, ...entry, minutes, balance: minutes - EXPECTED_MINUTES }];
    });
    return {
      completed,
      total: completed.reduce((sum, day) => sum + day.minutes, 0),
      expected: completed.length * EXPECTED_MINUTES,
      blank: days.length - completed.length,
    };
  }, [days, entries]);

  function updateEntry(date: string, field: keyof Entry, value: string) {
    const currentEntry = entries[date] ?? { start: "", end: "" };
    setEntries((current) => ({
      ...current,
      [date]: { ...currentEntry, [field]: value },
    }));
    setError("");
  }

  function review(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 3) return setError("Informe seu nome completo.");
    if (!summary.completed.length) return setError("Preencha pelo menos um dia antes de continuar.");
    const incomplete = days.find((day) => {
      const entry = entries[day.date];
      return Boolean(entry?.start) !== Boolean(entry?.end);
    });
    if (incomplete) return setError(`Complete a entrada e a saída do dia ${incomplete.day}.`);
    const invalid = days.find((day) => {
      const entry = entries[day.date];
      return entry?.start && entry?.end && minutesBetween(entry.start, entry.end) === null;
    });
    if (invalid) return setError(`No dia ${invalid.day}, a saída precisa ser posterior à entrada.`);
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collaborator: name.trim(), month, year,
          days: summary.completed.map(({ date, start, end }) => ({ date, start, end })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível finalizar o envio.");
      setProtocol(result.protocol);
      setStep("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível finalizar o envio.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "success") {
    return (
      <section className="success-panel" aria-live="polite">
        <span className="success-icon">✓</span>
        <p className="eyebrow">// REGISTRO CONCLUÍDO</p>
        <h2>Horas enviadas<br /><em>com sucesso.</em></h2>
        <p>Seu fechamento de {MONTHS[month - 1].toLowerCase()} foi registrado e a equipe já foi notificada.</p>
        <div className="protocol"><span>PROTOCOLO</span><strong>{protocol}</strong></div>
      </section>
    );
  }

  if (step === "review") {
    return (
      <section className="review-panel">
        <p className="eyebrow">// REVISE ANTES DE ENVIAR</p>
        <h2>Está tudo certo,<br /><em>{name.split(" ")[0]}?</em></h2>
        <div className="review-grid">
          <div><span>PERÍODO</span><strong>{MONTHS[month - 1]} / {year}</strong></div>
          <div><span>DIAS PREENCHIDOS</span><strong>{summary.completed.length}</strong></div>
          <div><span>TOTAL TRABALHADO</span><strong>{formatMinutes(summary.total)}</strong></div>
          <div><span>SALDO DO MÊS</span><strong className={summary.total - summary.expected < 0 ? "negative" : "positive"}>{formatMinutes(summary.total - summary.expected, true)}</strong></div>
        </div>
        {summary.blank > 0 && <p className="notice">Há {summary.blank} {summary.blank === 1 ? "dia útil sem horário" : "dias úteis sem horário"}. Eles não serão enviados.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button className="button-secondary" type="button" onClick={() => setStep("form")}>Voltar e corrigir</button>
          <button className="button-primary" type="button" onClick={submit} disabled={submitting}>{submitting ? "ENVIANDO..." : "CONFIRMAR E FINALIZAR →"}</button>
        </div>
      </section>
    );
  }

  return (
    <form className="timesheet" onSubmit={review}>
      <section className="identity-section">
        <div>
          <p className="section-number">01</p>
          <h2>Identificação</h2>
          <p>Comece informando quem você é e qual período deseja preencher.</p>
        </div>
        <div className="identity-fields">
          <label><span>SEU NOME COMPLETO</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Como você é conhecido na Wakanda?" autoComplete="name" /></label>
          <div className="field-row">
            <label><span>MÊS</span><select value={month} onChange={(event) => setMonth(Number(event.target.value))}>{MONTHS.map((label, index) => <option value={index + 1} key={label}>{label}</option>)}</select></label>
            <label><span>ANO</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((value) => <option key={value}>{value}</option>)}</select></label>
          </div>
        </div>
      </section>

      <section className="hours-section">
        <div className="section-heading">
          <div><p className="section-number">02</p><h2>Horários do mês</h2></div>
          <p>Preencha somente os dias trabalhados. Cada jornada é comparada com a referência de 9h.</p>
        </div>

        {[...groupedDays.entries()].map(([week, weekDays]) => {
          const weekMinutes = weekDays.reduce((sum, day) => sum + (minutesBetween(entries[day.date]?.start ?? "", entries[day.date]?.end ?? "") ?? 0), 0);
          const filled = weekDays.filter((day) => minutesBetween(entries[day.date]?.start ?? "", entries[day.date]?.end ?? "") !== null).length;
          return (
            <div className="week" key={week}>
              <div className="week-title"><span>SEMANA {String(week).padStart(2, "0")}</span><span>{filled ? `${formatMinutes(weekMinutes)} REGISTRADAS` : "AGUARDANDO PREENCHIMENTO"}</span></div>
              {weekDays.map((day) => {
                const entry = entries[day.date] ?? { start: "", end: "" };
                const minutes = minutesBetween(entry.start, entry.end);
                const balance = minutes === null ? null : minutes - EXPECTED_MINUTES;
                return (
                  <div className="day-row" key={day.date}>
                    <div className="day-label"><strong>{String(day.day).padStart(2, "0")}</strong><span>{day.weekday}</span></div>
                    <label><span>ENTRADA</span><input type="time" value={entry.start} onChange={(event) => updateEntry(day.date, "start", event.target.value)} /></label>
                    <label><span>SAÍDA</span><input type="time" value={entry.end} onChange={(event) => updateEntry(day.date, "end", event.target.value)} /></label>
                    <div className="day-total"><span>TOTAL / SALDO</span><strong>{minutes === null ? "—" : formatMinutes(minutes)}</strong>{balance !== null && <small className={balance < 0 ? "negative" : "positive"}>{formatMinutes(balance, true)}</small>}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      <section className="monthly-summary">
        <div><span>DIAS PREENCHIDOS</span><strong>{summary.completed.length}<small> / {days.length}</small></strong></div>
        <div><span>TOTAL DO MÊS</span><strong>{formatMinutes(summary.total)}</strong></div>
        <div><span>SALDO SOBRE 9H/DIA</span><strong className={summary.total - summary.expected < 0 ? "negative" : "positive"}>{formatMinutes(summary.total - summary.expected, true)}</strong></div>
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="submit-row"><p>Você poderá revisar tudo antes do envio definitivo.</p><button className="button-primary" type="submit">REVISAR APONTAMENTO →</button></div>
    </form>
  );
}
