# Portal Novara

Central demonstrativa de chamados da Novara TI, desenvolvida em HTML, CSS e JavaScript para a disciplina Desenvolvimento de Interfaces. A aplicação estática reúne apresentação, login, fila de chamados, relatórios e área de perfil.

- [Abrir o Portal Novara](https://amandabrs.github.io/portal-novara/)
- [Consultar o histórico de versões](https://github.com/amandabrs/portal-novara/commits/main/)

## Guia para estudar e explicar os arquivos ao professor

- **[assets/LEIA-ME.md](assets/LEIA-ME.md)**: finalidade das fotos, fontes e licenças da pasta `assets`.
- Os arquivos `index.html`, `styles.css`, `data.js`, `public.js` e `app.js` têm comentários didáticos diretamente no código. Procure por `//`, `/* ... */` e `<!-- ... -->`.
- `package.json` não aceita comentários por ser JSON válido; `.nojekyll` é um marcador de publicação e deve permanecer intacto.

## Como abrir

1. Baixe e extraia o ZIP do projeto ou clone o repositório.
2. No VS Code, abra a pasta que contém `index.html`.
3. Use a versão publicada ou execute `npm run dev` com Node.js e Python 3 instalados. Acesse `http://localhost:4321`. O primeiro acesso por convite usa Web Crypto, disponível via HTTPS e localhost.
4. Use `npm run check` para verificar a sintaxe dos scripts.

## Roteiro de demonstração

Abra **Entrar** e use um dos perfis fictícios abaixo. Os três usam a senha fictícia `NovaraDemo123`.

| Perfil | E-mail |
|---|---|
| Administrador | `admin@novarati.com` |
| Técnica de TI | `tecnico@novarati.com` |
| Colaboradora | `marina@novarati.com` |

1. No perfil **Administrador**, acesse **Equipe → Convidar**. Informe um nome e um endereço de teste no domínio `@novarati.com` e selecione **Criar convite**.
2. Use **Abrir convite** ou copie o link e abra no mesmo navegador. Preencha o nome, o telefone e ramal opcionais e uma senha fictícia. Confirme a senha e conclua o cadastro.
3. Use o e-mail do convite e a senha criada na tela de **Entrar**. Registre um chamado como colaborador. Depois clique em **Sair da conta** e entre como técnica para responder e atualizar o status.
4. Retorne ao perfil do colaborador pelo login e abra o chamado para ver a resposta. Em **Meu perfil**, teste a edição de dados e foto. Em **Acessibilidade**, alterne o tema e ajuste o tamanho do texto.
5. Na **Apresentação**, use os botões do carrossel e teste a validação do formulário de **Contato**.

Endereços de login de cadastros antigos são ajustados para `@novarati.com`. Consulte a área **Equipe** para ver o novo endereço. A senha e os dados do perfil continuam vinculados à mesma conta.

O convite pode ser usado uma vez e vale 24 horas no navegador em que foi criado. Escolha **Gerar novo link** para convites vencidos ou perfis da versão anterior que ainda precisam criar a senha. O portal simula os papéis de acesso. Use apenas dados e senhas fictícios. A aplicação não envia e-mails, não possui autenticação de produção e não sincroniza dados entre dispositivos.

## Como o site foi construído

1. **Estrutura e navegação.** O `index.html` estabelece cabeçalho, menu lateral, regiões de conteúdo, diálogos e rodapé. As rotas de fragmento permitem abrir uma área ou um convite por link no GitHub Pages.
2. **Identidade visual.** O `styles.css` centraliza a paleta em variáveis e usa Grid e Flexbox para organizar cartões, gráficos e formulários. A fonte Manrope e os ícones são servidos localmente.
3. **Fila de atendimento.** O `data.js` prepara chamados fictícios, filtra a fila e calcula a atividade por dia. O `app.js` monta os painéis e gerencia atualização de status, respostas, perfis e preferências.
4. **Interface pública.** O `public.js` monta apresentação, carrossel manual, cartões explicativos, contato e formulários de acesso. As fotografias e licenças ficam em `assets/`.
5. **Cadastro de demonstração.** O administrador gera um endereço com um identificador aleatório. Ao concluir o cadastro, a aplicação guarda uma derivação da senha fictícia, com salt individual e PBKDF2 via Web Crypto, para conferir o próximo login. O navegador guarda o estado da conta e os dados do projeto em `localStorage` e a sessão da aba em `sessionStorage`. O acesso e os papéis são controles locais de demonstração.
6. **Publicação.** A branch `main` registra as alterações em commits. O GitHub Pages serve a pasta `/ (root)` do repositório, sem etapa de build.

## Paleta e análise de contraste

O roxo destaca ações e liga a interface à marca Novara. O fundo claro e a navegação escura estabelecem uma hierarquia entre o conteúdo e o menu. Verde e âmbar identificam, respectivamente, chamados resolvidos e em andamento. O nome do status aparece junto da cor.

Contrastes calculados pela fórmula de luminância relativa da WCAG 2.2. Os pares de texto abaixo superam 4,5:1 para texto de tamanho normal. As bordas dos campos superam 3:1 contra a superfície adjacente. As medições se aplicam aos pares listados.

| Uso | Primeiro plano | Fundo | Contraste |
|---|---|---|---|
| Texto principal claro | `#1e1c31` | `#ffffff` | 16,59:1 |
| Texto secundário claro | `#625f76` | `#ffffff` | 6,14:1 |
| Botão principal claro | `#ffffff` | `#5434c4` | 7,88:1 |
| Navegação lateral | `#c1bed5` | `#1c1a30` | 9,35:1 |
| Texto principal escuro | `#f2efff` | `#222133` | 13,92:1 |
| Texto secundário escuro | `#bfbbd2` | `#222133` | 8,44:1 |
| Botão principal escuro | `#ffffff` | `#6742d7` | 6,29:1 |
| Borda de campo clara | `#8b869e` | `#ffffff` | 3,50:1 |
| Borda de campo escura | `#858099` | `#222133` | 4,16:1 |

A interface inclui foco visível, atalho para pular ao conteúdo, formulários com rótulos, carrossel com acionamento manual e ampliação de texto até 150% nas preferências. Esta análise é pontual. A avaliação de conformidade completa depende de testes adicionais com teclado, ampliação e tecnologias assistivas.

## Ferramentas e referências

- HTML, CSS e JavaScript sem framework. Git e GitHub para versionamento. GitHub Pages para hospedagem.
- ChatGPT/Codex para apoio na implementação, revisão de código e testes.
- Node.js para verificação de sintaxe, jsdom para testes de interação e Python para servir arquivos localmente.
- [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/) e [Understanding Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- [MDN — Web Storage API](https://developer.mozilla.org/pt-BR/docs/Web/API/Web_Storage_API) e [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
- [GitHub Docs — origem de publicação do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
- Fotografias ilustrativas do Pexels, sob a [licença Pexels](https://www.pexels.com/license/). [Equipe](https://www.pexels.com/photo/3184292/), [atendimento](https://www.pexels.com/photo/3769146/) e [tecnologia](https://www.pexels.com/photo/3861969/).
- As licenças da fonte Manrope e dos ícones Material Symbols Rounded estão em `assets/`.
