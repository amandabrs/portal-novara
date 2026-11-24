'use strict';

// DADOS PADRONIZADOS: listas usadas nos formulários, etiquetas, filtros e gráficos.
const statuses = [
  { name: 'Aberto', className: 'open', icon: 'confirmation_number', color: '#7657ed' },
  { name: 'Em andamento', className: 'progress', icon: 'timelapse', color: '#df8a24' },
  { name: 'Resolvido', className: 'done', icon: 'task_alt', color: '#259878' },
];
const priorities = ['Baixa', 'Média', 'Alta', 'Crítica'];
const categories = ['Acesso', 'Equipamentos', 'Rede', 'Sistemas', 'Outros'];
const basePeople = [
  { id: 'tecnico', name: 'Amanda Barros', email: 'tecnico@novarati.com', role: 'Técnica de TI' },
  { id: 'colaborador', name: 'Marina Costa', email: 'marina@novarati.com', role: 'Colaboradora' },
  { id: 'admin', name: 'Rafael Lima', email: 'admin@novarati.com', role: 'Administrador' },
];
// Nome da chave no localStorage: a aplicação guarda ali o objeto workspace convertido em JSON.
const storageKey = 'portal-novara-workspace';
const dayMs = 24 * 60 * 60 * 1000;
const companyDomain = 'novarati.com';
const seedDescription = 'Solicitação registrada na central de atendimento de TI.';
const demoPassword = 'NovaraDemo123';

// PRIMEIRO ACESSO: cria 12 chamados fictícios para demonstrar a interface antes de novos cadastros.
function seedTickets() {
  const examples = [
    ['Acesso ao painel financeiro', 'Acesso', 'Alta', 0, 0, 'Marina Costa'],
    ['Instabilidade no Wi-Fi do escritório', 'Rede', 'Crítica', 1, 0, 'Ana Lima'],
    ['Instalação do software de design', 'Sistemas', 'Média', 2, 1, 'Rafael Lima'],
    ['Monitor secundário sem sinal', 'Equipamentos', 'Média', 0, 1, 'Beatriz Alves'],
    ['Redefinição de acesso ao e-mail', 'Acesso', 'Baixa', 2, 2, 'Marina Costa'],
    ['VPN desconectando durante reuniões', 'Rede', 'Alta', 1, 2, 'João Martins'],
    ['Compartilhamento de pasta do projeto', 'Acesso', 'Baixa', 2, 3, 'Leandro Melo'],
    ['Atualização do navegador', 'Sistemas', 'Baixa', 2, 3, 'Marina Costa'],
    ['Fone de ouvido indisponível', 'Equipamentos', 'Média', 0, 4, 'Bianca Dias'],
    ['Erro ao exportar relatório', 'Sistemas', 'Alta', 1, 4, 'Rafael Lima'],
    ['Inclusão na lista de distribuição', 'Acesso', 'Baixa', 2, 5, 'Ana Lima'],
    ['Impressora do financeiro sem conexão', 'Equipamentos', 'Média', 2, 6, 'Leandro Melo'],
  ];
  return examples.map(([title, category, priority, status, age, requester], index) => {
    const created = new Date();
    created.setDate(created.getDate() - age);
    const resolved = status === 2 ? Math.min(Date.now(), created.getTime() + dayMs) : null;
    return {
      id: 1048 - index, title, category, priority, status: statuses[status].name,
      requester, owner: requester === 'Marina Costa' ? 'colaborador' : '',
      description: seedDescription,
      created: created.getTime(), resolved,
    };
  });
}

// RECUPERAÇÃO: lê o JSON armazenado e reconstrói o objeto com JSON.parse.
// Se não houver dados válidos, cria tickets de exemplo, convites vazios e identificador inicial.
function loadWorkspace(storage) {
  try {
    const saved = JSON.parse(storage.getItem(storageKey) ?? storage.getItem("coredesk-v2-workspace"));
    if (saved && Array.isArray(saved.tickets) && Array.isArray(saved.invites) && Number.isInteger(saved.nextId)) {
      migrateAccountEmails(saved.invites);
      for (const ticket of saved.tickets) {
        if (ticket.description === 'Chamado de demonstração para acompanhar o atendimento de TI.') {
          ticket.description = seedDescription;
        }
      }
      return saved;
    }
  } catch {
    // A demonstração também funciona em memória com o armazenamento indisponível.
  }
  return { tickets: seedTickets(), invites: [], nextId: 1049, theme: 'light' };
}

// VALIDAÇÃO: exige o domínio fictício @novarati.com nas contas da demonstração.
function isCompanyEmail(email) {
  const [local, domain, extra] = email.split('@');
  return Boolean(local && !/\s/.test(local) && domain === companyDomain && extra === undefined);
}

// COMPATIBILIDADE: adapta e-mails de convites antigos ao domínio atual, evitando duplicidades.
function migrateAccountEmails(invites) {
  const reserved = new Set([
    ...basePeople.map(person => person.email),
    ...invites.map(invite => invite.email).filter(isCompanyEmail),
  ]);
  for (const invite of invites) {
    if (isCompanyEmail(invite.email)) continue;
    const local = invite.email.split('@')[0].slice(0, 60);
    let email = local + '@' + companyDomain;
    let suffix = 2;
    while (reserved.has(email)) {
      email = local + '-' + suffix++ + '@' + companyDomain;
    }
    invite.email = email;
    reserved.add(email);
  }
}

// PERFIS: combina usuários de demonstração com funcionários que ativaram convite neste navegador.
function peopleFor(workspace) {
  return [...basePeople, ...workspace.invites.filter(invite => invite.accepted && invite.credential).map(invite => ({
    id: invite.token, name: invite.name, email: invite.email, role: 'Colaborador(a)',
  }))];
}

// VISIBILIDADE: técnico/administrador visualizam todos os chamados; colaborador vê os seus.
// A separação é apenas visual, não substitui autorização segura em um servidor.
function ticketsFor(workspace, role) {
  return ['tecnico', 'admin'].includes(role) ? workspace.tickets : workspace.tickets.filter(ticket => ticket.owner === role);
}

// BUSCA E FILTROS: filter() devolve os chamados que atendem a todas as condições escolhidas.
// normalize() remove acentos e padroniza letras para facilitar pesquisas digitadas.
function filterTickets(tickets, { query = '', status = '', priority = '', category = '' } = {}) {
  const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
  const term = normalize(query.trim());
  return tickets.filter(ticket => (
    (!status || ticket.status === status) &&
    (!priority || ticket.priority === priority) &&
    (!category || ticket.category === category) &&
    (!term || normalize([ticket.title, ticket.requester, ticket.category, `#${ticket.id}`].join(' ')).includes(term))
  ));
}

// GRÁFICO: agrupa chamados abertos e resolvidos por dia, considerando o período escolhido.
function ticketActivity(tickets, days, now = new Date()) {
  return Array.from({ length: days }, (_, index) => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1 + index);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const count = field => tickets.filter(ticket => ticket[field] >= +start && ticket[field] < +end).length;
    return { date: start, opened: count('created'), resolved: count('resolved') };
  });
}

// CONVITES: verifica token, data de expiração e se a pessoa já ativou a conta.
function availableInvite(workspace, token, now = Date.now()) {
  return workspace.invites.find(invite => inviteLinkToken(invite) === token && !invite.accepted && invite.expires > now);
}

function inviteLinkToken(invite) {
  return invite.linkToken ?? invite.token;
}

function randomHex() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

function toHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// SENHA DEMONSTRATIVA: PBKDF2 + SHA-256 cria uma derivação da senha com salt individual.
// Como toda verificação acontece no navegador, isto NÃO é autenticação segura de produção.
async function passwordDigest(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 600000, hash: 'SHA-256' }, key, 256,
  );
  return toHex(new Uint8Array(bits));
}
