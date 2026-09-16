# Wakanda Horas

Aplicação para apontamento mensal de horas, criada para a Wakanda Academy. O colaborador informa entrada e saída em cada dia útil; o sistema calcula a jornada real, o saldo em relação à referência de 9 horas, grava os registros no Google Sheets e envia um resumo ao Google Chat.

## Desenvolvimento

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e preencha as variáveis. O webhook e a chave da conta de serviço nunca devem usar o prefixo `NEXT_PUBLIC_`.

## Preparação da planilha

1. Crie uma aba chamada `Horas`.
2. Na primeira linha, adicione: `Protocolo`, `Enviado em`, `Colaborador`, `Período`, `Data`, `Dia`, `Entrada`, `Saída`, `Total trabalhado`, `Carga esperada`, `Saldo do dia`, `Total do mês`, `Saldo do mês`.
3. Compartilhe a planilha como **Editor** com o e-mail da conta de serviço.
4. Configure o ID da planilha e as credenciais na Vercel.

## Variáveis da Vercel

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_TAB` (opcional; padrão `Horas`)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_CHAT_WEBHOOK_URL`
- `PUBLIC_SHEET_URL` (opcional)

## Segurança

- Credenciais são utilizadas apenas na rota de servidor.
- O cliente nunca recebe a URL do webhook nem a chave do Google.
- Totais enviados pelo navegador não são confiados; o servidor recalcula todas as jornadas.
- O webhook é chamado somente depois de a planilha confirmar a gravação.
