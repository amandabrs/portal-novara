'use strict';

// DOM: $() seleciona o primeiro elemento HTML que corresponde ao seletor.
const $ = selector => document.querySelector(selector);
const main = $('#main');
const dialog = $('#dialog');
const publicMain = $('#public-main');
// Sessão demonstrativa: identifica o perfil ativo nesta aba via sessionStorage.
const sessionKey = 'portal-novara-demo-session';
const views = {
  dashboard: { hash: '#inicio', title: 'Visão geral' },
  tickets: { hash: '#chamados', title: 'Chamados' },
  reports: { hash: '#relatorios', title: 'Relatórios' },
  team: { hash: '#equipe', title: 'Equipe' },
  profile: { hash: '#meu-perfil', title: 'Meu perfil' },
  settings: { hash: '#preferencias', title: 'Preferências' },
};
// Cada propriedade guarda um filtro atual; string vazia significa nenhum filtro selecionado.
const filters = { query: '', status: '', priority: '', category: '' };
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const replyDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const longDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' });
// Estado principal: reúne chamados, convites e preferências; recupera dados locais ou exemplos.
let workspace = loadWorkspace(localStorage);
let view = 'dashboard';
let period = 7;
let toastTimeout;
let currentPersonId = readSession();
let loginEmail = '';
let afterLogin = 'dashboard';

// Segurança de exibição: converte caracteres especiais antes de mostrar textos em HTML.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const icon = (name, className = '') => `<span class="icon ${className}" aria-hidden="true">${name}</span>`;
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const avatar = (name, photo) => `<span class="avatar" aria-hidden="true">${photo ? `<img src="${esc(photo)}" alt="">` : esc(initials(name))}</span>`;
const displayPerson = person => ({ ...person, ...workspace.personalProfiles?.[person.id] });
// find() seleciona a conta atual na lista de pessoas, usando o identificador da sessão.
const account = () => peopleFor(workspace).find(person => person.id === currentPersonId);
const user = () => displayPerson(account());
// Visibilidade: técnico/admin consultam todos; colaborador vê seus chamados (simulação local).
const visibleTickets = () => ticketsFor(workspace, user().id).slice().sort((a, b) => b.id - a.id);
const canManage = () => ['tecnico', 'admin'].includes(user().id);
const options = (entries, value = '') => entries.map(entry =>
  `<option${entry === value ? ' selected' : ''}>${esc(entry)}</option>`).join('');
const countBy = (tickets, key, value) => tickets.filter(ticket => ticket[key] === value).length;
const pageTitle = (title, description, action = '') => `<div class="page-title"><div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
const newButton = () => `<button class="button primary" type="button" data-action="new">${icon('add')}Novo chamado</button>`;

// Feedback: exibe uma mensagem temporária na área de status acessível.
function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.hidden = true; }, 4800);
}

// Recupera o perfil ativo no sessionStorage, quando disponível.
function readSession() {
  try { return sessionStorage.getItem(sessionKey); } catch { return null; }
}

// sessionStorage persiste a seleção do perfil enquanto a aba está ativa; não é login seguro.
function setSession(id) {
  currentPersonId = id;
  try {
    if (id) sessionStorage.setItem(sessionKey, id);
    else sessionStorage.removeItem(sessionKey);
  } catch {
    // A sessão ainda vale em memória nesta aba.
  }
}

// Ao sair, limpa a sessão e filtros e remove os componentes exibidos no painel.
function endSession() {
  setSession(null);
  Object.assign(filters, { query: '', status: '', priority: '', category: '' });
  main.replaceChildren();
}

// Armazenamento: JSON.stringify converte workspace para texto; localStorage.setItem salva.
function save() {
  // O objeto workspace vira uma string JSON para caber no armazenamento do navegador.
  try {
    localStorage.setItem(storageKey, JSON.stringify(workspace));
    return true;
  } catch {
    return false;
  }
}

// Depois da ação: tenta salvar, fecha o diálogo, atualiza a tela e avisa o usuário.
function finishChange(message) {
  const persisted = save();
  if (dialog.open) dialog.close();
  render();
  notify(persisted ? message : `${message} O navegador manteve os dados só nesta aba.`);
}

// Indicadores: conta chamados por status a partir dos dados atuais, sem totais fixos.
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

// Gráfico de atividade: calcula aberturas e resoluções por dia.
function activity(tickets) {
  // Os dados de cada dia são calculados por ticketActivity(), definida no data.js.
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

// Gráfico de rosca: distribui os chamados por status e calcula percentuais.
function distribution(tickets) {
  const entries = statuses.map(status => ({ ...status, value: countBy(tickets, 'status', status.name) }));
  let end = 0;
  // map() transforma as quantidades em fatias percentuais para o gradiente circular CSS.
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

// Tabela: transforma os objetos do array em linhas de HTML.
function ticketTable(tickets) {
  if (!tickets.length) return '<p class="empty">Nenhum chamado encontrado.</p>';
  // tabindex permite foco na tabela com o teclado; esc() protege textos digitados contra HTML acidental.
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

// Tela de consulta: combina abas de status, campo de pesquisa, seletores e a tabela gerada.
function ticketPage() {
  return `${pageTitle('Chamados', 'Consulte e acompanhe as solicitações de TI.', newButton())}
  <section class="panel" aria-label="Pesquisa e lista de chamados">
    <div class="status-tabs" role="group" aria-label="Filtrar por status">
      ${['', ...statuses.map(status => status.name)].map(status =>
        `<button type="button" class="button secondary" data-status="${status}" aria-pressed="${filters.status === status}">${status || 'Todos'}</button>`).join('')}
    </div>
    <div class="filters">
      <label>Buscar<input type="search" id="ticket-search" data-filter="query" value="${esc(filters.query)}" placeholder="Título, ID ou solicitante"></label>
      <label>Prioridade<select data-filter="priority"><option value="">Todas</option>${options(priorities, filters.priority)}</select></label>
      <label>Categoria<select data-filter="category"><option value="">Todas</option>${options(categories, filters.category)}</select></label>
    </div>
    <div id="ticket-results"></div>
  </section>`;
}

// Busca: utiliza filterTickets() de data.js para aplicar os filtros combinados.
function renderTicketResults() {
  const result = filterTickets(visibleTickets(), filters);
  $('#ticket-results').innerHTML = `<p class="result-count" role="status">${result.length} ${result.length === 1 ? 'chamado encontrado' : 'chamados encontrados'}</p>${ticketTable(result)}`;
}

// Relatórios: calcula os valores exibidos a partir dos chamados visíveis.
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

// Página da equipe: lista pessoas/convites; só o perfil admin recebe o botão de convidar.
function team() {
  const admin = user().id === 'admin';
  const action = admin ? `<button class="button primary" type="button" data-action="invite">${icon('add')}Convidar</button>` : '';
  const people = peopleFor(workspace).map(displayPerson).map(person => `<li>
    ${avatar(person.name, person.photo)}<div class="member-details"><strong>${esc(person.name)}</strong><small>${esc(person.email)}</small></div>${pill(person.role, 'neutral')}
  </li>`).join('');
  const inviteRows = workspace.invites.filter(invite => !invite.accepted || !invite.credential).map(invite => {
    const token = inviteLinkToken(invite);
    const actions = availableInvite(workspace, token)
      ? `<a class="button secondary" href="#convite=${esc(token)}">Abrir convite</a>
        <button class="button secondary" type="button" data-copy-invite="${esc(token)}">Copiar link</button>`
      : `${pill(invite.accepted ? 'Cadastro incompleto' : 'Expirado', 'neutral')}
        <button class="button secondary" type="button" data-renew-invite="${esc(invite.token)}">Gerar novo link</button>`;
    return `<li>${avatar(invite.name)}<div class="member-details"><strong>${esc(invite.name)}</strong><small>${esc(invite.email)}</small></div>
      <div class="invite-actions">${actions}</div></li>`;
  }).join('');
  return `${pageTitle('Equipe', 'Gerencie os convites e consulte os integrantes da equipe.', action)}
    <section class="panel">
      ${panelHeading('Pessoas', 'Participantes deste espaço de trabalho')}
      <ul class="member-list">${people}</ul>
    </section>
    ${admin ? `<section class="panel table-panel">
      ${panelHeading('Convites', 'Cada link vale por 24 horas neste navegador. O portal não envia e-mail.')}
      ${inviteRows ? `<ul class="member-list">${inviteRows}</ul>` : '<p class="empty">Nenhum convite pendente.</p>'}
    </section>` : ''}`;
}

// Página de perfil: apresenta campos para nome, contato e foto da conta demonstrativa.
function profile() {
  const person = user();
  return `${pageTitle('Meu perfil', 'Edite sua foto e seus dados de contato.')}
    <form id="profile-form" class="panel settings-panel profile-form">
      <div class="profile-preview">${avatar(person.name, person.photo)}<div><strong>${esc(person.name)}</strong><p>${esc(person.role)}</p></div></div>
      <label>Nome de exibição<input name="name" value="${esc(person.name)}" required minlength="2" maxlength="80" autocomplete="name"></label>
      <label>E-mail de contato<input name="contactEmail" type="email" value="${esc(person.contactEmail ?? person.email)}" maxlength="120" autocomplete="email"></label>
      <div class="form-grid">
        <label>Telefone<input name="phone" type="tel" value="${esc(person.phone)}" maxlength="24" autocomplete="tel"></label>
        <label>Ramal<input name="extension" value="${esc(person.extension)}" maxlength="8"></label>
      </div>
      <label>Foto de perfil<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-hint"></label>
      <p id="photo-hint">JPG, PNG ou WebP de até 1 MB.</p>
      ${person.photo ? '<label class="remove-photo"><input name="removePhoto" type="checkbox"> Remover foto atual</label>' : ''}
      <p class="form-error" role="alert"></p>
      <button class="button primary" type="submit">Salvar perfil</button>
    </form>`;
}

// Perfil: valida campos e foto; salva as alterações locais do usuário.
async function saveProfile(event) {
  event.preventDefault();
  const form = event.target;
  const person = user();
  const data = new FormData(form);
  const error = form.querySelector('.form-error');
  const submit = form.querySelector('button[type=submit]');
  const name = data.get('name').trim();
  const file = data.get('photo');
  error.textContent = '';
  if (name.length < 2) {
    error.textContent = 'Digite pelo menos dois caracteres no nome.';
    return;
  }
  submit.disabled = true;
  try {
    let photo = data.has('removePhoto') ? '' : person.photo;
    if (file.size && !data.has('removePhoto')) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
        error.textContent = 'Escolha uma foto JPG, PNG ou WebP de até 1 MB.';
        return;
      }
      photo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    const previous = workspace.personalProfiles;
    workspace.personalProfiles = { ...previous, [person.id]: {
      name, contactEmail: data.get('contactEmail').trim(), phone: data.get('phone').trim(),
      extension: data.get('extension').trim(), photo,
    } };
    if (!save()) {
      workspace.personalProfiles = previous;
      error.textContent = 'Não foi possível salvar. Confira o espaço disponível no navegador.';
      return;
    }
    if (form.isConnected) {
      render();
      $('#profile-form button').focus();
    }
    notify('Perfil atualizado.');
  } catch {
    error.textContent = 'Não foi possível carregar a foto.';
  } finally {
    submit.disabled = false;
  }
}

// Acessibilidade: gera seletores de tema e tamanho de fonte no painel.
function settings() {
  const size = workspace.fontSize ?? '100';
  return `${pageTitle('Preferências e acessibilidade', 'Ajuste a aparência e o tamanho do texto.')}
  <section class="panel settings-panel">
    <h2>Aparência</h2><p>O tema fica salvo neste navegador.</p>
    <label for="theme-choice">Tema</label>
    <select id="theme-choice"><option value="light">Claro</option><option value="dark"${workspace.theme === 'dark' ? ' selected' : ''}>Escuro</option></select>
    <label for="font-size">Tamanho do texto</label>
    <select id="font-size">${['100', '112', '125', '150'].map(value => `<option value="${value}"${value === size ? ' selected' : ''}>${value}%</option>`).join('')}</select>
  </section>
  <section class="panel settings-panel">
    <h2>Armazenamento local</h2><p>Chamados, convites e preferências ficam no navegador. Os perfis simulam as funções de uma central de TI.</p>
  </section>`;
}

// Renderização: monta novamente a página conforme a seção e o perfil selecionados.
function render() {
  if (!account()) return;
  const person = user();
  const tickets = visibleTickets();
  applyAppearance();
  $('#public-shell').hidden = true;
  $('#app-shell').hidden = false;
  $('#skip-link').href = '#main';
  document.title = `${views[view].title} · Portal Novara`;
  $('#breadcrumb').textContent = views[view].title;
  $('#nav-count').textContent = tickets.filter(ticket => ticket.status !== 'Resolvido').length;
  $('#profile-button').innerHTML = `${avatar(person.name, person.photo)}<span class="profile-name"><strong>${esc(person.name)}</strong><small>${esc(person.role)}</small></span>${icon('keyboard_arrow_right', 'profile-arrow')}`;
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.nav === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const layouts = { dashboard, tickets: ticketPage, reports, team, profile, settings };
  main.innerHTML = layouts[view](tickets);
  if (view === 'tickets') renderTicketResults();
}

// Menu responsivo: mostra/oculta a barra lateral em telas menores e gerencia o foco.
function setMenu(open, focus = true) {
  $('#sidebar').classList.toggle('is-open', open);
  $('#sidebar-scrim').hidden = !open;
  $('#menu-toggle').setAttribute('aria-expanded', String(open));
  $('.content-shell').inert = open;
  if (open && focus) $('#sidebar .nav-link[aria-current]').focus();
  if (!open && focus) $('#menu-toggle').focus();
}

// Troca a seção interna e atualiza a URL, deixando histórico navegável com #fragmentos.
function goTo(next) {
  if (dialog.open) dialog.close();
  view = next;
  history.pushState(null, '', views[view].hash);
  setMenu(false, false);
  render();
  main.focus();
  window.scrollTo(0, 0);
}

// Acessibilidade: alterna as variáveis do tema no CSS e grava a escolha.
function setTheme(theme) {
  workspace.theme = theme;
  const persisted = save();
  applyAppearance();
  if ($('#theme-choice')) $('#theme-choice').value = theme;
  if (!persisted) notify('O tema vale apenas nesta aba.');
}

// Aplica tema e escala da fonte ao HTML; as variáveis CSS fazem o restante.
function applyAppearance() {
  document.documentElement.dataset.theme = workspace.theme;
  const size = workspace.fontSize ?? '100';
  document.documentElement.style.fontSize = ['100', '112', '125', '150'].includes(size) ? size + '%' : '';
}

// Janela reutilizável: monta o formulário e conecta seu submit à função recebida.
// Usa <dialog> nativo para mostrar a caixa de forma modal.
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
    const error = dialog.querySelector('.form-error');
    error.textContent = '';
    const message = onSubmit?.(new FormData(event.currentTarget));
    if (message) error.textContent = message;
  });
  dialog.showModal();
}

// Cadastro: valida o formulário, cria o chamado com ID e o adiciona ao workspace.
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
      // nextId++ usa o ID atual e incrementa para o próximo; o chamado começa como Aberto.
      const ticket = {
        id: workspace.nextId++, title, description, category: data.get('category'),
        priority: data.get('priority'), status: 'Aberto', requester: user().name,
        owner: user().id, created: Date.now(), resolved: null,
      };
      // push() acrescenta o novo chamado ao array do workspace, antes da tentativa de salvamento.
      workspace.tickets.push(ticket);
      Object.assign(filters, { query: '', status: '', priority: '', category: '' });
      goTo('tickets');
      finishChange(`Chamado #${ticket.id} registrado.`);
    },
  });
}

// Detalhes: mostra o chamado e disponibiliza resposta/alteração ao perfil técnico.
function openTicket(id) {
  const ticket = visibleTickets().find(item => item.id === id);
  if (!ticket) return;
  const detail = (label, value) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
  const replies = ticket.replies ?? [];
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
    </div>` : ''}
    <section class="ticket-replies" aria-labelledby="replies-heading">
      <h3 id="replies-heading">Respostas do atendimento</h3>
      ${replies.length ? `<ol class="reply-list">${replies.map(reply => `
        <li><div class="reply-header"><strong>${esc(reply.author)}</strong>
          <time datetime="${new Date(reply.created).toISOString()}">${esc(replyDate.format(reply.created))}</time></div>
          <p>${esc(reply.message)}</p></li>`).join('')}</ol>` : '<p>Nenhuma resposta neste chamado.</p>'}
      ${canManage() ? '<label>Escrever resposta (opcional)<textarea name="reply" maxlength="1000" placeholder="Informe o que foi feito ou oriente o solicitante."></textarea></label>' : ''}
    </section>`, {
    submitLabel: canManage() ? 'Salvar alterações' : '',
    onSubmit(data) {
      if (!canManage()) return;
      const current = workspace.tickets.find(item => item.id === id);
      if (!current) return;
      const message = data.get('reply').trim();
      if (message.length > 1000) return 'Escreva uma resposta de até 1000 caracteres.';
      const status = data.get('status');
      // Spread (...) copia o chamado, substitui os campos alterados e registra a resolução, se houver.
      const updated = { ...current, status, priority: data.get('priority'),
        resolved: status === 'Resolvido' ? (current.resolved ?? Date.now()) : null,
      };
      // Se o técnico escreveu uma resposta, adiciona texto, autor e data ao histórico do chamado.
      if (message) {
        updated.replies = [...(current.replies ?? []), { author: user().name, message, created: Date.now() }];
      }
      const original = workspace.tickets;
      workspace.tickets = original.map(item => item.id === id ? updated : item);
      if (!save()) {
        workspace.tickets = original;
        return 'Não foi possível salvar. Confira o espaço disponível no navegador.';
      }
      dialog.close();
      render();
      notify(message ? `Resposta salva no chamado #${id}.` : `Chamado #${id} atualizado.`);
      (main.querySelector(`[data-ticket="${id}"]`) ?? main).focus();
    },
  });
}

// Salva a lista de convites; em caso de erro, restaura os dados antigos para não perder consistência.
function saveInvites(invites) {
  const original = workspace.invites;
  workspace.invites = invites;
  if (save()) return true;
  workspace.invites = original;
  return false;
}

// Convite: gera link demonstrativo com token e vencimento de 24 horas no mesmo navegador.
function newInvitation() {
  if (account()?.id !== 'admin') return;
  showDialog('Convidar colaborador', `
    <p>O convite vale por 24 horas no navegador onde foi criado.</p>
    <label>Nome<input name="name" required minlength="2" maxlength="80" autofocus></label>
    <label>E-mail corporativo<input name="email" type="email" maxlength="120" required></label>`, {
    submitLabel: 'Criar convite',
    onSubmit(data) {
      if (account()?.id !== 'admin') return;
      const name = data.get('name').trim();
      const email = data.get('email').trim().toLowerCase();
      if (name.length < 2) return 'Preencha o nome com pelo menos 2 caracteres.';
      if (!isCompanyEmail(email)) return 'Use um e-mail com o domínio @novarati.com.';
      if (basePeople.some(person => person.email === email) ||
          workspace.invites.some(invite => invite.email === email)) {
        return 'Já existe um cadastro ou convite para esse e-mail. Confira a lista de convites.';
      }
      const invite = { name, email, token: randomHex(), expires: Date.now() + dayMs, accepted: false };
      if (!saveInvites([...workspace.invites, invite])) return 'Não foi possível salvar o convite neste navegador.';
      dialog.close();
      render();
      main.querySelector('[data-copy-invite="' + invite.token + '"]').focus();
      notify('Convite criado. Copie o link ou abra o primeiro acesso.');
    },
  });
}

// Quando um convite expirou, o admin pode gerar outro token sem criar um funcionário duplicado.
function renewInvitation(id) {
  if (account()?.id !== 'admin') return;
  const invite = workspace.invites.find(item => item.token === id);
  if (!invite || invite.credential || availableInvite(workspace, inviteLinkToken(invite))) return;
  const renewed = { ...invite, linkToken: randomHex(), expires: Date.now() + dayMs, accepted: false };
  const invites = workspace.invites.map(item => item === invite ? renewed : item);
  if (!saveInvites(invites)) {
    notify('Não foi possível renovar o convite neste navegador.');
    return;
  }
  render();
  main.querySelector('[data-copy-invite="' + renewed.linkToken + '"]').focus();
  notify('Novo link criado. O link anterior foi desativado.');
}

// Copia o endereço do convite; se a cópia automática falhar, mostra o link para copiar manualmente.
async function copyInvitation(token) {
  if (account()?.id !== 'admin' || !availableInvite(workspace, token)) return;
  const url = new URL(location.href);
  url.hash = 'convite=' + token;
  const currentUrl = location.href;
  try {
    await navigator.clipboard.writeText(url.href);
    notify('Link copiado. Abra no mesmo navegador para concluir o primeiro acesso.');
  } catch {
    if (location.href !== currentUrl) return;
    showDialog('Copiar convite', `<label>Link do convite<input id="manual-invite" readonly value="${esc(url.href)}"></label>
      <p>Copie o endereço e abra no mesmo navegador.</p>`);
    $('#manual-invite').focus();
    $('#manual-invite').select();
  }
}

// Login fictício: compara credenciais locais; não existe autenticação em servidor.
async function logIn(data, form) {
  const email = data.get('email').trim().toLowerCase();
  const password = data.get('password');
  if (!isCompanyEmail(email)) return 'Use um e-mail com o domínio @novarati.com.';
  const preset = basePeople.find(person => person.email === email);
  const invite = workspace.invites.find(item => item.email === email && item.accepted && item.credential);
  const valid = preset ? password === demoPassword : invite &&
    await passwordDigest(password, invite.credential.salt) === invite.credential.digest;
  if (!form.isConnected) return;
  if (!valid) return 'E-mail ou senha incorretos.';
  setSession(preset?.id ?? invite.token);
  loginEmail = '';
  goTo(afterLogin);
  afterLogin = 'dashboard';
  notify('Você entrou no Portal Novara.');
}

// Ativação: confere convite, deriva senha com Web Crypto e registra conta localmente.
async function activateAccount(data, form) {
  const hash = location.hash;
  const token = hash.slice('#convite='.length);
  const name = data.get('name').trim();
  const password = data.get('password');
  if (name.length < 2 || name.length > 80) return 'Use de 2 a 80 caracteres no nome.';
  if (password.length < 8 || password.length > 80) return 'Use de 8 a 80 caracteres na senha.';
  if (password !== data.get('confirmation')) return 'As senhas digitadas são diferentes.';
  const salt = randomHex();
  const digest = await passwordDigest(password, salt);
  if (!form.isConnected || location.hash !== hash) return;
  workspace = loadWorkspace(localStorage);
  const current = availableInvite(workspace, token);
  if (!current) {
    route();
    return;
  }
  const invites = workspace.invites;
  const profiles = workspace.personalProfiles;
  workspace.invites = invites.map(item => item === current ? {
    ...item, name, accepted: true, credential: { salt, digest },
  } : item);
  workspace.personalProfiles = { ...profiles, [current.token]: {
    ...profiles?.[current.token], name, phone: data.get('phone').trim(), extension: data.get('extension').trim(),
  } };
  if (!save()) {
    workspace.invites = invites;
    workspace.personalProfiles = profiles;
    return 'Não foi possível salvar este cadastro no navegador.';
  }
  endSession();
  loginEmail = current.email;
  afterLogin = 'dashboard';
  history.replaceState(null, '', '#entrar');
  route();
  $('#login-form [name=password]').focus();
  notify('Cadastro concluído. Entre com a senha que você criou.');
}

// Alterna da área interna para a área pública e atualiza título, links e conteúdo HTML.
function showPublic(markup, title) {
  $('#app-shell').hidden = true;
  $('#public-shell').hidden = false;
  $('#skip-link').href = '#public-main';
  const entry = $('#public-entry');
  entry.href = account() ? '#inicio' : '#entrar';
  entry.textContent = account() ? 'Abrir painel' : 'Entrar';
  document.title = title + ' · Portal Novara';
  publicMain.innerHTML = markup;
  publicMain.focus({ preventScroll: true });
}

// Navegação: usa o fragmento # da URL para decidir qual seção mostrar.
function route() {
  const hash = location.hash;
  const next = Object.keys(views).find(key => views[key].hash === hash);
  if (dialog.open) dialog.close();
  setMenu(false, false);
  applyAppearance();
  if (hash.startsWith('#convite=')) {
    const invite = availableInvite(workspace, hash.slice('#convite='.length));
    showPublic(activationPage(invite), 'Primeiro acesso');
  } else if (hash === '#entrar' || (!account() && next && next !== 'dashboard')) {
    if (next) {
      afterLogin = next;
      history.replaceState(null, '', '#entrar');
    }
    showPublic(loginPage(loginEmail), 'Entrar');
  } else if (account() && (next || !hash)) {
    view = next ?? 'dashboard';
    render();
    main.focus({ preventScroll: true });
  } else {
    showPublic(presentationPage(Boolean(account())), 'Central de chamados');
    setSlide(0);
    if (hash === '#contato' || hash === '#recursos') {
      $(hash).scrollIntoView();
      $(hash).focus({ preventScroll: true });
      return;
    }
  }
  window.scrollTo(0, 0);
}

// Sair limpa a sessão local e retorna o usuário à tela de login demonstrativo.
function signOut() {
  endSession();
  loginEmail = '';
  afterLogin = 'dashboard';
  history.replaceState(null, '', '#entrar');
  route();
  notify('Você saiu da conta.');
}

// EVENTOS PÚBLICOS: escuta cliques nas setas do carrossel dentro da área de apresentação.
publicMain.addEventListener('click', event => {
  const control = event.target.closest('[data-slide]');
  if (!control) return;
  const index = Number($('#portal-carousel').dataset.index);
  const count = portalSlides.length;
  setSlide((index + Number(control.dataset.slide) + count) % count);
});

// FORMULÁRIOS PÚBLICOS: identifica se o envio foi de contato, login ou ativação.
// preventDefault evita recarregar a página; o contato apenas valida, não envia e-mail.
publicMain.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const error = form.querySelector('.form-error');
  error.textContent = '';
  if (form.id === 'contact-form') {
    const result = form.querySelector('.form-result');
    result.textContent = '';
    if (data.get('name').trim() && data.get('message').trim().length >= 10) {
      form.reset();
      result.textContent = 'Mensagem validada. Para enviar, use o e-mail de contato no rodapé.';
    } else {
      error.textContent = 'Preencha o nome e uma mensagem com pelo menos 10 caracteres.';
    }
    return;
  }
  const action = form.id === 'login-form' ? logIn : activateAccount;
  const submit = form.querySelector('button[type=submit]');
  if (submit.disabled) return;
  submit.disabled = true;
  try {
    const message = await action(data, form);
    if (message) error.textContent = message;
  } catch {
    error.textContent = 'Não foi possível verificar a senha neste navegador. Abra o portal publicado ou use um servidor local.';
  } finally {
    submit.disabled = false;
  }
});

// EVENTOS GERAIS: um único listener identifica o botão clicado por data-action/data-nav.
// Essa técnica é chamada delegação de eventos e funciona com elementos criados dinamicamente.
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
  const copy = event.target.closest('[data-copy-invite]');
  if (copy) copyInvitation(copy.dataset.copyInvite);
  const renew = event.target.closest('[data-renew-invite]');
  if (renew) renewInvitation(renew.dataset.renewInvite);
  if (action === 'theme') setTheme(workspace.theme === 'dark' ? 'light' : 'dark');
  if (action === 'logout') signOut();
  if (action === 'new') newTicket();
  if (action === 'invite') newInvitation();
  if (action === 'close' && dialog.open) dialog.close();
});

// FILTROS EM TEMPO REAL: a digitação modifica filters e atualiza somente os resultados.
main.addEventListener('input', event => {
  const key = event.target.dataset.filter;
  if (!Object.hasOwn(filters, key)) return;
  filters[key] = event.target.value;
  renderTicketResults();
});
// ABAS DE STATUS: clicar muda o filtro e aria-pressed indica qual opção está ativa.
main.addEventListener('click', event => {
  const tab = event.target.closest('[data-status]');
  if (!tab) return;
  filters.status = tab.dataset.status;
  main.querySelectorAll('[data-status]').forEach(button => {
    button.setAttribute('aria-pressed', String(button === tab));
  });
  renderTicketResults();
});
main.addEventListener('submit', event => {
  if (event.target.id === 'profile-form') saveProfile(event);
});

// ALTERAÇÕES: responde ao período do gráfico, tema e tamanho de fonte.
main.addEventListener('change', event => {
  if (event.target.id === 'period') {
    period = Number(event.target.value);
    render();
    $('#period').focus();
  }
  if (event.target.id === 'theme-choice') setTheme(event.target.value);
  if (event.target.id === 'font-size') {
    workspace.fontSize = event.target.value;
    applyAppearance();
    if (!save()) notify('O tamanho do texto vale apenas nesta aba.');
  }
});

$('#menu-toggle').addEventListener('click', () => setMenu(!$('#sidebar').classList.contains('is-open')));
$('#sidebar-scrim').addEventListener('click', () => setMenu(false));
// Adaptação móvel: se a tela ficar larga novamente, fecha o menu lateral temporário.
window.matchMedia('(max-width: 900px)').addEventListener('change', event => {
  if (!event.matches) setMenu(false, false);
});
// Pesquisa global: encaminha o usuário à busca de chamados.
function search() {
  if (view !== 'tickets') goTo('tickets');
  $('#ticket-search').focus();
}
$('#global-search').addEventListener('click', search);
document.addEventListener('keydown', event => {
  if (dialog.open || $('#app-shell').hidden) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    search();
  }
  if (event.key === 'Escape' && $('#sidebar').classList.contains('is-open')) setMenu(false);
});
window.addEventListener('hashchange', () => { if (!['#main', '#public-main'].includes(location.hash)) route(); });
window.addEventListener('storage', event => {
  if (event.key !== storageKey) return;
  workspace = loadWorkspace(localStorage);
  const hash = location.hash;
  if (hash.startsWith('#convite=') && !availableInvite(workspace, hash.slice('#convite='.length))) route();
  if (!$('#app-shell').hidden) {
    if (account()) render();
    else route();
  } else applyAppearance();
});
route();
