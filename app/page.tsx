import { TimesheetForm } from "@/components/timesheet-form";
import Image from "next/image";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Wakanda Academy">
          <span className="brand-mark" aria-hidden="true">W.</span>
          <span>WAKANDA</span>
        </a>
        <span className="header-meta">APONTAMENTO / 2026</span>
      </header>

      <section className="hero" id="top">
        <Image className="hero-logo" src="/logo-wakanda.png" alt="" width={360} height={360} priority aria-hidden="true" />
        <p className="eyebrow">// APONTAMENTO DE HORAS</p>
        <h1>Seu mês de trabalho,<br /><em>sem complicação.</em></h1>
        <p className="hero-copy">
          Informe seus horários de entrada e saída. Nós calculamos o total de cada dia,
          o saldo em relação às 9 horas e o fechamento do mês.
        </p>
      </section>

      <TimesheetForm />

      <footer>
        <span>WAKANDA ACADEMY</span>
        <span>FEITO PARA QUEM CONSTRÓI.</span>
      </footer>
    </main>
  );
}
