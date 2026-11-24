'use strict';

const $ = selector => document.querySelector(selector);
const main = $('#main');
const dialog = $('#dialog');
const profilePanel = $('#profile-panel');
const roleSelect = $('#role');
const views = {
  dashboard: { hash: '#inicio', title: 'Visão geral' },
  tickets: { hash: '#chamados', title: 'Chamados' },
  reports: { hash: '#relatorios', title: 'Relatórios' },
  team: { hash: '#equipe', title: 'Equipe' },
  settings: { hash: '#preferencias', title: 'Preferências' },
};
const filters = { query: '', status: '', priority: '', category: '' };
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const longDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' });
let workspace = loadWorkspace(localStorage);
let view = 'dashboard';
let period = 7;
let toastTimeout;
let activeInvitation = '';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const icon = (name, className = '') => `<span class="icon ${className}" aria-hidden="true">${name}</span>`;
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const avatar = name => `<span class="avatar" aria-hidden="true">${esc(initials(name))}</span>`;
const user = () => peopleFor(workspace).find(person => person.id === workspace.role) ?? basePeople[0];
const visibleTickets = () => ticketsFor(workspace, user().id).slice().sort((a, b) => b.id - a.id);
const canManage = () => ['tecnico', 'admin'].includes(user().id);
const options = (entries, value = '') => entries.map(entry =>
  `<option${entry === value ? ' selected' : ''}>${esc(entry)}</option>`).join('');
const countBy = (tickets, key, value) => tickets.filter(ticket => ticket[key] === value).length;
const pageTitle = (title, description, action = '') => `<div class="page-title"><div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
const newButton = () => `<button class="button primary" type="button" data-action="new">${icon('add')}Novo chamado</button>`;

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.hidden = true; }, 4800);
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(workspace));
    return true;
  } catch {
    return false;
  }
}

function finishChange(message) {
  const persisted = save();
  if (dialog.open) dialog.close();
  render();
  notify(persisted ? message : `${message} O navegador manteve os dados só nesta aba.`);
}

function statsFor(tickets) {
  return [
    { title: 'Total de chamados', value: tickets.length, icon: 'confirmation_number', description: 'Todos os chamados visíveis' },
    ...statuses.map((status, index) => ({
      title: ['Abertos', 'Em andamento', 'Resolvidos'][index],
      value: countBy(tickets, 'status', status.name),
      icon: ['monitor', 'timelapse', 'task_alt'][index],
      className: status.className,
      description: ['Aguardando atendimento', 'Em atendimento pela equipe', 'Atendimentos concluídos'][index],
    })),
  ];
}

function summary(tickets) {
  return `<section class="stats" aria-label="Indicadores">${statsFor(tickets).map(stat => `
    <article class="stat">
      <div class="stat-top"><span class="stat-title">${stat.title}</span>
        <span class="stat-icon ${stat.className ?? ''}">${icon(stat.icon)}</span></div>
      <div class="stat-value">${stat.value}</div>
      <p class="stat-description">${stat.description}</p>
    </article>`).join('')}</section>`;
}

function panelHeading(title, caption, control = '') {
  return `<div class="panel-heading"><div><h2>${title}</h2><p>${caption}</p></div>${control}</div>`;
}

function activity(tickets) {
  const days = ticketActivity(tickets, period);
  const max = Math.max(4, Math.ceil(Math.max(...days.flatMap(day => [day.opened, day.resolved])) / 4) * 4);
  const ticks = [max, max * .75, max * .5, max * .25, 0];
  const periodSelect = `<select class="compact-select" id="period" aria-label="Período de atividade">
    <option value="7"${period === 7 ? ' selected' : ''}>Últimos 7 dias</option>
    <option value="14"${period === 14 ? ' selected' : ''}>Últimos 14 dias</option>
  </select>`;
  const label = days.map(day => `${shortDate.format(day.date)}: ${day.opened} abertos, ${day.resolved} resolvidos`).join('. ');
  return `<section class="panel">
    ${panelHeading('Atividade de chamados', 'Aberturas e resoluções por dia', periodSelect)}
    <div class="chart-legend">
      <span class="legend-item"><span class="legend-swatch swatch-open"></span>Abertos</span>
      <span class="legend-item"><span class="legend-swatch swatch-resolved"></span>Resolvidos</span>
    </div>
    <figure class="activity-chart" role="img" aria-label="${esc(label)}">
      <div class="scale" aria-hidden="true">${ticks.map(value => `<span>${value}</span>`).join('')}</div>
      <div class="chart-gridlines" aria-hidden="true">${ticks.map(() => '<span></span>').join('')}</div>
      <div class="chart-days" aria-hidden="true">${days.map((day, index) => `
        <div class="chart-day" title="${esc(shortDate.format(day.date))} · ${day.opened} abertos · ${day.resolved} resolvidos">
          <div class="bars">
            <span class="bar swatch-open" style="--height:${day.opened / max * 100}%"></span>
            <span class="bar swatch-resolved" style="--height:${day.resolved / max * 100}%"></span>
          </div>
          <span>${period === 7 ? weekday.format(day.date).replace('.', '') : index % 2 === 0 ? day.date.getDate() : ''}</span>
        </div>`).join('')}</div>
    </figure>
  </section>`;
}

function distribution(tickets) {
  const entries = statuses.map(status => ({ ...status, value: countBy(tickets, 'status', status.name) }));
  let end = 0;
  const gradient = entries.map(entry => {
    const start = end;
    end += (entry.value / (tickets.length || 1)) * 100;
    return `${entry.color} ${start}% ${end}%`;
  }).join(', ');
  return `<section class="panel">
    ${panelHeading('Chamados por status', 'Distribuição atual dos atendimentos')}
    <div class="distribution-body">
      <div class="donut" style="--donut:${tickets.length ? `conic-gradient(${gradient})` : 'var(--line)'}" aria-hidden="true">
        <div class="donut-center"><strong>${tickets.length}</strong><small>Total</small></div>
      </div>
      <ul class="distribution-list">${entries.map(entry => `<li>
        <span class="status-dot" style="background:${entry.color}"></span>${entry.name}<strong>${entry.value}</strong>
      </li>`).join('')}</ul>
    </div>
  </section>`;
}

function pill(label, className) {
  return `<span class="pill ${className}">${esc(label)}</span>`;
}

function ticketTable(tickets) {
  if (!tickets.length) return '<p class="empty">Nenhum chamado encontrado.</p>';
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="Lista de chamados"><table>
    <thead><tr><th scope="col">ID</th><th scope="col">Chamado</th><th scope="col">Solicitante</th><th scope="col">Prioridade</th><th scope="col">Status</th><th scope="col">Abertura</th></tr></thead>
    <tbody>${tickets.map(ticket => `<tr>
      <td>#${ticket.id}</td>
      <td class="subject-cell"><button class="ticket-link" data-ticket="${ticket.id}" type="button">${esc(ticket.title)}</button><span class="ticket-category">${esc(ticket.category)}</span></td>
      <td>${esc(ticket.requester)}</td>
      <td>${pill(ticket.priority, ['low', 'medium', 'high', 'critical'][priorities.indexOf(ticket.priority)] ?? 'neutral')}</td>
      <td>${pill(ticket.status, statuses.find(status => status.name === ticket.status)?.className ?? 'neutral')}</td>
      <td>${esc(shortDate.format(ticket.created))}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function dashboard(tickets) {
  const firstName = user().name.trim().split(/\s+/)[0];
  return `<section class="hero">
    <div class="hero-art" aria-hidden="true"><span></span></div>
    <div class="hero-copy">
      <span class="hero-date">${icon('calendar_today')}${esc(longDate.format(new Date()))}</span>
      <h1>Olá, ${esc(firstName)}!</h1>
      <p>Acompanhe os atendimentos e organize as solicitações de TI.</p>
    </div>
    ${newButton()}
  </section>
  ${summary(tickets)}
  <div class="chart-grid">${activity(tickets)}${distribution(tickets)}</div>
  <section class="panel table-panel">
    ${panelHeading('Chamados recentes', 'Últimas solicitações registradas',
      '<a class="button secondary" href="#chamados" data-nav="tickets">Ver todos</a>')}
    ${ticketTable(tickets.slice(0, 5))}
  </section>`;
}

function ticketPage() {
  return `${pageTitle('Chamados', 'Consulte e acompanhe as solicitações de TI.', newButton())}
  <section class="panel" aria-label="Pesquisa e lista de chamados">
    <div class="filters">
      <label>Buscar<input type="search" id="ticket-search" data-filter="query" value="${esc(filters.query)}" placeholder="Título, ID ou solicitante"></label>
      <label>Status<select data-filter="status"><option value="">Todos</option>${options(statuses.map(status => status.name), filters.status)}</select></label>
      <label>Prioridade<select data-filter="priority"><option value="">Todas</option>${options(priorities, filters.priority)}</select></label>
      <label>Categoria<select data-filter="category"><option value="">Todas</option>${options(categories, filters.category)}</select></label>
    </div>
    <div id="ticket-results"></div>
  </section>`;
}

function renderTicketResults() {
  const result = filterTickets(visibleTickets(), filters);
  $('#ticket-results').innerHTML = `<p class="result-count" role="status">${result.length} ${result.length === 1 ? 'chamado encontrado' : 'chamados encontrados'}</p>${ticketTable(result)}`;
}

function reports(tickets) {
  function breakdown(title, key, labels) {
    const counts = labels.map(label => [label, countBy(tickets, key, label)]);
    const max = Math.max(1, ...counts.map(([, value]) => value));
    return `<section class="panel">${panelHeading(title, 'Total por classificação')}
      <ul class="report-lines">${counts.map(([label, value]) => `
        <li><span>${label}</span><span class="line-track" aria-hidden="true"><span style="width:${value / max * 100}%"></span></span><strong>${value}</strong></li>
      `).join('')}</ul>
    </section>`;
  }
  return `${pageTitle('Relatórios', 'Indicadores de volume e distribuição dos atendimentos.')}
    ${summary(tickets)}
    <div class="chart-grid">${breakdown('Por categoria', 'category', categories)}${breakdown('Por prioridade', 'priority', priorities)}</div>`;
}

function team() {
  const admin = user().id === 'admin';
  const action = admin ? `<button class="button primary" type="button" data-action="invite">${icon('add')}Convidar</button>` : '';
  const people = peopleFor(workspace).map(person => `<li>
    ${avatar(person.name)}<div class="member-details"><strong>${esc(person.name)}</strong><small>${esc(person.email)}</small></div>${pill(person.role, 'neutral')}
  </li>`).join('');
  const inviteRows = workspace.invites.filter(invite => !invite.accepted).map(invite => `
    <li>${avatar(invite.name)}<div class="member-details"><strong>${esc(invite.name)}</strong><small>${esc(invite.email)}</small></div>
      ${availableInvite(workspace, invite.token) ? `<a class="invite-link" href="#convite=${esc(invite.token)}">Abrir convite</a>` : pill('Expirado', 'neutral')}</li>`).join('');
  return `${pageTitle('Equipe', 'Perfis e convites de demonstração.', action)}
    <section class="panel">
      ${panelHeading('Pessoas', 'Participantes deste espaço de trabalho')}
      <ul class="member-list">${people}</ul>
    </section>
    ${admin ? `<section class="panel table-panel">
      ${panelHeading('Convites', 'O link vale por 24 horas neste navegador.')}
      ${inviteRows ? `<ul class="member-list">${inviteRows}</ul>` : '<p class="empty">Nenhum convite pendente.</p>'}
    </section>` : ''}`;
}

function settings() {
  return `${pageTitle('Preferências', 'Personalize sua experiência no Portal Novara.')}
  <section class="panel settings-panel">
    <h2>Aparência</h2><p>O tema fica salvo neste navegador.</p>
    <label for="theme-choice">Tema</label>
    <select id="theme-choice"><option value="light">Claro</option><option value="dark"${workspace.theme === 'dark' ? ' selected' : ''}>Escuro</option></select>
  </section>
  <section class="panel settings-panel">
    <h2>Armazenamento local</h2><p>Chamados, convites e preferências ficam no navegador. Os perfis simulam as funções de uma central de TI.</p>
  </section>`;
}

function render() {
  const person = user();
  const tickets = visibleTickets();
  document.documentElement.dataset.theme = workspace.theme;
  document.title = `${views[view].title} · Portal Novara`;
  $('#breadcrumb').textContent = views[view].title;
  $('#nav-count').textContent = tickets.filter(ticket => ticket.status !== 'Resolvido').length;
  $('#profile-button').innerHTML = `${avatar(person.name)}<span class="profile-name"><strong>${esc(person.name)}</strong><small>${esc(person.role)}</small></span>${icon('keyboard_arrow_down', 'profile-arrow')}`;
  roleSelect.innerHTML = peopleFor(workspace).map(p =>
    `<option value="${esc(p.id)}"${p.id === person.id ? ' selected' : ''}>${esc(p.role)} · ${esc(p.name)}</option>`).join('');
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.nav === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const layouts = { dashboard, tickets: ticketPage, reports, team, settings };
  main.innerHTML = layouts[view](tickets);
  if (view === 'tickets') renderTicketResults();
}

function setMenu(open, focus = true) {
  $('#sidebar').classList.toggle('is-open', open);
  $('#sidebar-scrim').hidden = !open;
  $('#menu-toggle').setAttribute('aria-expanded', String(open));
  $('.content-shell').inert = open;
  if (open && focus) $('#sidebar .nav-link[aria-current]').focus();
  if (!open && focus) $('#menu-toggle').focus();
}

function setProfilePanel(open) {
  profilePanel.hidden = !open;
  $('#profile-button').setAttribute('aria-expanded', String(open));
  if (open) roleSelect.focus();
}

function goTo(next) {
  if (dialog.open) dialog.close();
  view = next;
  history.pushState(null, '', views[view].hash);
  setMenu(false, false);
  setProfilePanel(false);
  render();
  main.focus();
  window.scrollTo(0, 0);
}

function setTheme(theme) {
  workspace.theme = theme;
  const persisted = save();
  document.documentElement.dataset.theme = theme;
  if ($('#theme-choice')) $('#theme-choice').value = theme;
  if (!persisted) notify('O tema vale apenas nesta aba.');
}

function showDialog(title, body, { submitLabel, onSubmit } = {}) {
  if (dialog.open) dialog.close();
  dialog.innerHTML = `<form>
    <div class="dialog-heading"><h2 id="dialog-title">${esc(title)}</h2>
      <button class="icon-button" type="button" data-action="close" aria-label="Fechar janela">${icon('close')}</button>
    </div>
    <div class="dialog-body">${body}<p class="form-error" role="alert"></p></div>
    <div class="dialog-actions">
      <button class="button secondary" type="button" data-action="close">${submitLabel ? 'Cancelar' : 'Fechar'}</button>
      ${submitLabel ? `<button class="button primary" type="submit">${submitLabel}</button>` : ''}
    </div>
  </form>`;
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const error = $('.form-error');
    error.textContent = '';
    const message = onSubmit?.(new FormData(event.currentTarget));
    if (message) error.textContent = message;
  });
  dialog.showModal();
}

function newTicket() {
  showDialog('Novo chamado', `
    <label>Título<input name="title" maxlength="100" minlength="3" required autofocus></label>
    <div class="form-grid">
      <label>Categoria<select name="category" required><option value="">Selecione</option>${options(categories)}</select></label>
      <label>Prioridade<select name="priority" required>${options(priorities, 'Média')}</select></label>
    </div>
    <label>Descrição<textarea name="description" minlength="10" maxlength="2000" required placeholder="Descreva o que aconteceu."></textarea></label>`, {
    submitLabel: 'Registrar chamado',
    onSubmit(data) {
      const title = data.get('title').trim();
      const description = data.get('description').trim();
      if (title.length < 3 || description.length < 10) {
        return 'Use pelo menos 3 caracteres no título e 10 na descrição.';
      }
      const ticket = {
        id: workspace.nextId++, title, description, category: data.get('category'),
        priority: data.get('priority'), status: 'Aberto', requester: user().name,
        owner: user().id, created: Date.now(), resolved: null,
      };
      workspace.tickets.push(ticket);
      Object.assign(filters, { query: '', status: '', priority: '', category: '' });
      goTo('tickets');
      finishChange(`Chamado #${ticket.id} registrado.`);
    },
  });
}

function openTicket(id) {
  const ticket = visibleTickets().find(item => item.id === id);
  if (!ticket) return;
  const detail = (label, value) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
  showDialog(`#${ticket.id} · ${ticket.title}`, `
    <dl class="details">
      ${detail('Solicitante', ticket.requester)}${detail('Abertura', shortDate.format(ticket.created))}
      ${detail('Categoria', ticket.category)}${detail('Prioridade', ticket.priority)}
      ${detail('Status', ticket.status)}${ticket.resolved ? detail('Resolução', shortDate.format(ticket.resolved)) : ''}
    </dl>
    <p class="ticket-description">${esc(ticket.description)}</p>
    ${canManage() ? `<div class="form-grid">
      <label>Alterar status<select name="status">${options(statuses.map(status => status.name), ticket.status)}</select></label>
      <label>Alterar prioridade<select name="priority">${options(priorities, ticket.priority)}</select></label>
    </div>` : ''}`, {
    submitLabel: canManage() ? 'Salvar alterações' : '',
    onSubmit(data) {
      if (!canManage()) return;
      const current = workspace.tickets.find(item => item.id === id);
      if (!current) return;
      current.status = data.get('status');
      current.priority = data.get('priority');
      current.resolved = current.status === 'Resolvido' ? (current.resolved ?? Date.now()) : null;
      finishChange(`Chamado #${id} atualizado.`);
      (main.querySelector(`[data-ticket="${id}"]`) ?? main).focus();
    },
  });
}

function newInvitation() {
  if (user().id !== 'admin') return;
  showDialog('Convidar colaborador', `
    <p>O convite vale por 24 horas no navegador onde foi criado.</p>
    <label>Nome<input name="name" required minlength="2" maxlength="80" autofocus></label>
    <label>E-mail<input name="email" type="email" maxlength="120" required></label>`, {
    submitLabel: 'Criar convite',
    onSubmit(data) {
      if (user().id !== 'admin') return;
      const name = data.get('name').trim();
      const email = data.get('email').trim().toLowerCase();
      if (name.length < 2) {
        return 'Preencha o nome com pelo menos 2 caracteres.';
      }
      if (peopleFor(workspace).some(person => person.email === email) ||
          workspace.invites.some(invite => invite.email === email && availableInvite(workspace, invite.token))) {
        return 'Já existe uma pessoa cadastrada ou um convite ativo com esse e-mail.';
      }
      const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
      workspace.invites.push({ name, email, token, expires: Date.now() + dayMs, accepted: false });
      finishChange('Convite criado. Use “Abrir convite” para simular o primeiro acesso.');
    },
  });
}

function route() {
  const hash = location.hash;
  if (hash.startsWith('#convite=')) {
    const token = hash.slice('#convite='.length);
    if (dialog.open) dialog.close();
    activeInvitation = '';
    dialog.replaceChildren();
    const invite = availableInvite(workspace, token);
    if (!invite) {
      history.replaceState(null, '', views[view].hash);
      notify('Convite expirado, inválido ou já utilizado.');
      return;
    }
    activeInvitation = token;
    showDialog('Aceitar convite', `<p>${esc(invite.name)} · ${esc(invite.email)}</p>
      <p>Ao aceitar, você entra como colaborador neste ambiente demonstrativo.</p>`, {
      submitLabel: 'Aceitar e entrar',
      onSubmit() {
        const current = availableInvite(workspace, token);
        if (!current || location.hash !== '#convite=' + token) {
          route();
          return;
        }
        current.accepted = true;
        workspace.role = current.token;
        activeInvitation = '';
        history.replaceState(null, '', views.dashboard.hash);
        view = 'dashboard';
        finishChange('Convite aceito. Seu perfil de colaborador está ativo.');
        main.focus();
      },
    });
    return;
  }
  if (activeInvitation) {
    activeInvitation = '';
    if (dialog.open) dialog.close();
  }
  view = Object.keys(views).find(key => views[key].hash === hash) ?? 'dashboard';
  render();
}

document.addEventListener('click', event => {
  const link = event.target.closest('[data-nav]');
  if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    goTo(link.dataset.nav);
    return;
  }
  const ticket = event.target.closest('[data-ticket]');
  if (ticket) openTicket(Number(ticket.dataset.ticket));
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'new') newTicket();
  if (action === 'invite') newInvitation();
  if (action === 'close' && dialog.open) dialog.close();
});

dialog.addEventListener('close', () => {
  if (dialog.open || !activeInvitation) return;
  if (location.hash === '#convite=' + activeInvitation) history.replaceState(null, '', views[view].hash);
  activeInvitation = '';
});

main.addEventListener('input', event => {
  const key = event.target.dataset.filter;
  if (!Object.hasOwn(filters, key)) return;
  filters[key] = event.target.value;
  renderTicketResults();
});

main.addEventListener('change', event => {
  if (event.target.id === 'period') {
    period = Number(event.target.value);
    render();
    $('#period').focus();
  }
  if (event.target.id === 'theme-choice') setTheme(event.target.value);
});

$('#menu-toggle').addEventListener('click', () => setMenu(!$('#sidebar').classList.contains('is-open')));
$('#sidebar-scrim').addEventListener('click', () => setMenu(false));
window.matchMedia('(max-width: 900px)').addEventListener('change', event => {
  if (!event.matches) setMenu(false, false);
});
$('#theme-toggle').addEventListener('click', () => setTheme(workspace.theme === 'dark' ? 'light' : 'dark'));
$('#profile-button').addEventListener('click', () => setProfilePanel(profilePanel.hidden));
roleSelect.addEventListener('change', () => {
  workspace.role = roleSelect.value;
  setProfilePanel(false);
  finishChange(`Perfil alterado para ${user().name}.`);
  $('#profile-button').focus();
});

function search() {
  if (view !== 'tickets') goTo('tickets');
  $('#ticket-search').focus();
}
$('#global-search').addEventListener('click', search);
document.addEventListener('keydown', event => {
  if (dialog.open) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    search();
  }
  if (event.key === 'Escape' && !profilePanel.hidden) {
    setProfilePanel(false);
    $('#profile-button').focus();
  } else if (event.key === 'Escape' && $('#sidebar').classList.contains('is-open')) {
    setMenu(false);
  }
});
window.addEventListener('hashchange', () => { if (location.hash !== '#main') route(); });
window.addEventListener('storage', event => {
  if (event.key !== storageKey) return;
  workspace = loadWorkspace(localStorage);
  if (activeInvitation) route();
  else render();
});
route();
