import { google } from "googleapis";
import { NextResponse } from "next/server";
import { z } from "zod";
import { EXPECTED_MINUTES, formatMinutes, minutesBetween } from "@/lib/time";

export const runtime = "nodejs";

const payloadSchema = z.object({
  collaborator: z.string().trim().min(3).max(120),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  days: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  })).min(1).max(23),
});

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function getConfiguration() {
  const config = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    sheetTab: process.env.GOOGLE_SHEETS_TAB ?? "Horas",
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    webhookUrl: process.env.GOOGLE_CHAT_WEBHOOK_URL,
  };
  if (!config.spreadsheetId || !config.clientEmail || !config.privateKey || !config.webhookUrl) {
    throw new Error("Integração não configurada. Verifique as variáveis de ambiente da Vercel.");
  }
  return {
    spreadsheetId: config.spreadsheetId,
    sheetTab: config.sheetTab,
    clientEmail: config.clientEmail,
    privateKey: config.privateKey,
    webhookUrl: config.webhookUrl,
  };
}

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const config = getConfiguration();
    const protocol = `WAK-${payload.year}${String(payload.month).padStart(2, "0")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const createdAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Bahia" }).format(new Date());

    const calculatedDays = payload.days.map((day) => {
      const date = new Date(`${day.date}T12:00:00-03:00`);
      if (date.getFullYear() !== payload.year || date.getMonth() + 1 !== payload.month || [0, 6].includes(date.getDay())) throw new Error("Há uma data inválida no envio.");
      const minutes = minutesBetween(day.start, day.end);
      if (minutes === null || minutes > 24 * 60) throw new Error(`Horário inválido em ${day.date}.`);
      return { ...day, minutes, balance: minutes - EXPECTED_MINUTES, weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Bahia" }).format(date) };
    });
    const total = calculatedDays.reduce((sum, day) => sum + day.minutes, 0);
    const totalBalance = calculatedDays.reduce((sum, day) => sum + day.balance, 0);

    const auth = new google.auth.JWT({ email: config.clientEmail, key: config.privateKey, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth });
    const rows = calculatedDays.map((day) => [
      protocol, createdAt, payload.collaborator, `${MONTHS[payload.month - 1]}/${payload.year}`,
      day.date, day.weekday, day.start, day.end, formatMinutes(day.minutes),
      formatMinutes(EXPECTED_MINUTES), formatMinutes(day.balance, true), formatMinutes(total), formatMinutes(totalBalance, true),
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `'${config.sheetTab}'!A:M`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows },
    });

    const sheetLink = process.env.PUBLIC_SHEET_URL ? `\n🔗 ${process.env.PUBLIC_SHEET_URL}` : "";
    const message = [
      "✅ *Planilha de horas finalizada*",
      `👤 Colaborador: ${payload.collaborator}`,
      `📅 Período: ${MONTHS[payload.month - 1]}/${payload.year}`,
      `🗓️ Dias trabalhados: ${calculatedDays.length}`,
      `⏱️ Total: ${formatMinutes(total)}`,
      `⚖️ Saldo sobre 9h/dia: ${formatMinutes(totalBalance, true)}`,
      `🕒 Finalizada em: ${createdAt}`,
      `🧾 Protocolo: ${protocol}${sheetLink}`,
    ].join("\n");

    const webhookResponse = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
    if (!webhookResponse.ok) {
      console.error("Google Chat webhook failed", webhookResponse.status, await webhookResponse.text());
      return NextResponse.json({ protocol, warning: "Horas salvas, mas a notificação não foi entregue." }, { status: 201 });
    }
    return NextResponse.json({ protocol }, { status: 201 });
  } catch (cause) {
    console.error("Timesheet submission failed", cause);
    const message = cause instanceof z.ZodError ? "Confira os dados informados e tente novamente." : cause instanceof Error ? cause.message : "Erro inesperado ao salvar as horas.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
