'use strict';

const portalSlides = [
  { image: 'equipe', title: 'Um ponto de encontro para a equipe', caption: 'Acompanhe o que está aberto, em andamento ou resolvido.' },
  { image: 'atendimento', title: 'Respostas no próprio chamado', caption: 'Leia as orientações do suporte junto com o histórico da solicitação.' },
  { image: 'tecnologia', title: 'Relatórios para organizar a fila', caption: 'Consulte o volume de chamados por categoria e prioridade.' },
];

function presentationPage(signedIn) {
  const entry = signedIn ? 'Abrir painel' : 'Entrar no portal';
  return `
    <section class="public-hero">
      <div class="public-hero-copy">
        <h1>Central de chamados de TI</h1>
        <p>Registre solicitações, acompanhe o atendimento e consulte as respostas da equipe em um só lugar.</p>
        <a class="button primary" href="${signedIn ? '#inicio' : '#entrar'}">${entry}</a>
      </div>
      <section id="portal-carousel" class="portal-carousel" aria-roledescription="carrossel" aria-label="O portal em três etapas">
        <figure>
          <img id="slide-image" src="assets/equipe.jpg" alt="" width="960" height="540">
          <figcaption id="slide-caption" aria-live="polite" aria-atomic="true"></figcaption>
        </figure>
        <div class="carousel-controls">
          <button class="button secondary" type="button" data-slide="-1">Anterior</button>
          <button class="button secondary" type="button" data-slide="1">Próxima</button>
        </div>
      </section>
    </section>
    <section id="recursos" class="public-section" tabindex="-1" aria-labelledby="resources-title">
      <h2 id="resources-title">O que você pode fazer no portal</h2>
      <div class="public-cards">
        <article class="panel"><h3>${icon('confirmation_number')}Abrir um chamado</h3><p>Descreva o problema, selecione a categoria e acompanhe sua solicitação na fila.</p></article>
        <article class="panel"><h3>${icon('group')}Acompanhar a resposta</h3><p>O técnico atualiza o status e registra a orientação no próprio chamado.</p></article>
        <article class="panel"><h3>${icon('bar_chart')}Consultar indicadores</h3><p>Veja o volume de atendimentos e a distribuição por status, categoria e prioridade.</p></article>
      </div>
    </section>
    <section id="contato" class="panel contact-section" aria-labelledby="contact-title" tabindex="-1">
      <div><h2 id="contact-title">Contato</h2><p>Use dados fictícios para testar o formulário. O ambiente acadêmico valida os campos sem enviar mensagens.</p></div>
      <form id="contact-form" class="public-form">
        <div class="form-grid">
          <label>Nome<input name="name" autocomplete="name" required maxlength="80"></label>
          <label>E-mail<input name="email" type="email" autocomplete="email" required maxlength="120"></label>
        </div>
        <label>Mensagem<textarea name="message" required minlength="10" maxlength="1000"></textarea></label>
        <p class="form-error" role="alert"></p>
        <p class="form-result" role="status"></p>
        <button class="button primary" type="submit">Validar mensagem</button>
      </form>
    </section>`;
}

function setSlide(index) {
  const slide = portalSlides[index];
  const carousel = $('#portal-carousel');
  carousel.dataset.index = index;
  $('#slide-image').src = `assets/${slide.image}.jpg`;
  $('#slide-caption').innerHTML = `<strong>${slide.title}</strong><p>${slide.caption}</p><small>Imagem ${index + 1} de ${portalSlides.length}</small>`;
}

function loginPage(email) {
  return `
    <section class="access-layout">
      <div class="access-intro">
        <h1>Entrar no Portal Novara</h1>
        <p>Use uma conta de demonstração ou a conta que você ativou por convite neste navegador.</p>
        <details class="panel demo-credentials">
          <summary>Ver credenciais de demonstração</summary>
          <ul>${basePeople.map(person => `<li><strong>${esc(person.role)}</strong><span>${esc(person.email)}</span></li>`).join('')}</ul>
          <p>Senha fictícia das três contas <code>${demoPassword}</code></p>
        </details>
      </div>
      <form id="login-form" class="panel public-form access-form">
        <h2>Acesso à conta</h2>
        <label>E-mail<input name="email" type="email" value="${esc(email)}" autocomplete="username" required maxlength="120"></label>
        <label>Senha fictícia<input name="password" type="password" autocomplete="current-password" required maxlength="80"></label>
        <p>Ambiente demonstrativo. Use apenas dados fictícios.</p>
        <p class="form-error" role="alert"></p>
        <button class="button primary" type="submit">Entrar</button>
      </form>
    </section>`;
}

function activationPage(invite) {
  if (!invite) return `
    <section class="panel access-form">
      <h1>Convite indisponível</h1>
      <p>O convite venceu, já foi usado ou foi criado em outro navegador. Peça um novo link ao administrador da demonstração.</p>
      <a class="button primary" href="#entrar">Ir para o login</a>
    </section>`;
  return `
    <section class="access-layout">
      <div class="access-intro">
        <h1>Complete seu cadastro</h1>
        <p>O e-mail do convite será usado no login da demonstração. Depois de concluir o cadastro, você poderá entrar com a senha fictícia que criar aqui.</p>
      </div>
      <form id="activation-form" class="panel public-form access-form">
        <h2>Primeiro acesso</h2>
        <label>Nome de exibição<input name="name" value="${esc(invite.name)}" autocomplete="name" required minlength="2" maxlength="80"></label>
        <label>E-mail do convite<input name="email" type="email" value="${esc(invite.email)}" autocomplete="username" readonly></label>
        <div class="form-grid">
          <label>Telefone (opcional)<input name="phone" type="tel" maxlength="24" autocomplete="tel"></label>
          <label>Ramal (opcional)<input name="extension" maxlength="8"></label>
        </div>
        <label>Crie uma senha fictícia<input name="password" type="password" minlength="8" maxlength="80" autocomplete="new-password" aria-describedby="password-hint" required></label>
        <p id="password-hint">Use de 8 a 80 caracteres. Evite senhas que você usa em outras contas.</p>
        <label>Confirme a senha<input name="confirmation" type="password" maxlength="80" autocomplete="new-password" required></label>
        <p class="form-error" role="alert"></p>
        <button class="button primary" type="submit">Concluir cadastro</button>
        <a href="#entrar">Voltar ao login</a>
      </form>
    </section>`;
}
