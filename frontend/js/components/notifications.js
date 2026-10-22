// Notificações derivadas do estado atual (o backend não possui módulo de notificações).
import { session } from '../core/session.js';
import { laboratorios } from '../services/laboratorios.js';
import { reservas } from '../services/reservas.js';
import { fmtRelativeDay, fmtTime, daysFromToday, plural } from '../core/format.js';

export async function loadNotifications() {
  const items = [];
  const labs = await laboratorios.listarComResumo();

  if (session.isDocente || session.isAdmin) {
    try {
      const prox = await reservas.proximas();
      const hoje = prox.filter((r) => daysFromToday(r.data) === 0);
      for (const r of hoje.slice(0, 3)) {
        items.push({
          tone: 'info', icon: 'clock', important: true, href: `/reservas/${r.id}`,
          title: `Aula hoje às ${fmtTime(r.horaInicio)}`,
          text: `${r.disciplina} · ${r.laboratorioNome} (${r.turmaNome})`,
        });
      }
      const amanha = prox.filter((r) => daysFromToday(r.data) === 1);
      for (const r of amanha.slice(0, 2)) {
        items.push({
          tone: 'success', icon: 'calendar', href: `/reservas/${r.id}`,
          title: `Reserva ${fmtRelativeDay(r.data, { withDate: false }).toLowerCase()} às ${fmtTime(r.horaInicio)}`,
          text: `${r.disciplina} · ${r.laboratorioNome}`,
        });
      }
    } catch { /* reservas indisponíveis para este perfil */ }
  }

  for (const lab of labs) {
    if (lab.total && lab.ativos === 0) {
      items.push({ tone: 'danger', icon: 'alertCircle', important: true, href: `/laboratorios/${lab.id}`, title: `${lab.nome} indisponível`, text: 'Nenhum computador ativo neste laboratório.' });
    } else if (lab.manutencao) {
      items.push({ tone: 'warning', icon: 'wrench', important: session.isAdmin, href: `/laboratorios/${lab.id}`, title: `${lab.nome}: manutenção`, text: `${plural(lab.manutencao, 'computador', 'computadores')} em manutenção.` });
    }
  }
  return items;
}
