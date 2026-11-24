# GUIA DE ESTUDO DO CÓDIGO — Portal Novara

> Este guia foi escrito para ajudar na leitura do código durante a apresentação de Desenvolvimento de Interfaces. Abra o arquivo mencionado no GitHub ou no VS Code e procure os comentários em português imediatamente acima das funções.
>
> **Importante:** trata-se de um protótipo acadêmico. Contas, convites e chamados são locais ao navegador. Não há autenticação em servidor, sincronização de computadores nem envio real de e-mails.

## 1. Ordem sugerida de estudo

1. **index.html** — estrutura básica, menu, rodapé, áreas `#public-main` e `#main`.
2. **styles.css** — cores em `:root`, layout em Grid/Flexbox, modo escuro, adaptação a celulares e acessibilidade.
3. **data.js** — dados iniciais, recuperação do armazenamento, filtros, gráficos e convites.
4. **public.js** — construção da apresentação, carrossel, login e primeiro acesso.
5. **app.js** — lógica principal: telas, eventos, cadastros, salvamento, dashboard, relatórios, perfis.
6. **assets/** — fotografias, fontes e licenças.
7. **package.json, .nojekyll e README.md** — execução, hospedagem e documentação.

## 2. Como os arquivos se comunicam

O `index.html` inclui os arquivos `data.js`, `public.js` e `app.js`, nesta ordem, com `defer`. Primeiro são declaradas as funções de dados; depois as funções da área pública; por último o aplicativo inicializa o estado e liga os eventos aos controles.

**HTML** informa *o que existe*. **CSS** informa *como aparece*. **JavaScript** informa *o que acontece quando clicamos*.

O `app.js` gera grande parte das telas com HTML dinâmico, como o dashboard e a lista de chamados. Portanto, não estranhe se não encontrar todas as tabelas escritas diretamente no `index.html`.

## 3. O armazenamento: a pergunta mais provável da banca

- `data.js`: `storageKey = 'portal-novara-workspace'` define o nome da chave.
- `data.js`: `loadWorkspace(localStorage)` recupera os dados com `getItem()` e `JSON.parse()`.
- `data.js`: `seedTickets()` cria 12 chamados fictícios somente quando não existem dados válidos.
- `app.js`: `workspace` guarda em memória chamados, convites e preferências.
- `app.js`: `save()` chama `localStorage.setItem(storageKey, JSON.stringify(workspace))`.
- `app.js`: `finishChange()` salva, fecha a janela, atualiza a interface e avisa o usuário.
- `app.js`: `sessionStorage` armazena apenas o identificador do perfil ativo na aba.

**Em uma frase:** o JavaScript altera objetos em memória, transforma o estado em texto JSON e o grava no armazenamento do navegador; na próxima visita, lê o JSON e reconstrói o estado.

**Limitação:** mudar de navegador/notebook não transfere esses dados. O GitHub guarda o **código**, não os chamados cadastrados no computador.

## 4. Funções de data.js

| Função | Para que serve | Conceito aplicado |
|---|---|---|
| `seedTickets()` | Cria os exemplos iniciais | arrays, objetos, `map()` |
| `loadWorkspace()` | Recupera os dados ou usa exemplos | `localStorage`, `JSON.parse()`, `try/catch` |
| `isCompanyEmail()` | Exige e-mail com domínio fictício `@novarati.com` | string, `split()`, condições |
| `migrateAccountEmails()` | Adapta convites antigos ao domínio atual | laços, conjuntos `Set` |
| `peopleFor()` | Reúne perfis predefinidos e ativados | `filter()`, `map()`, spread `...` |
| `ticketsFor()` | Filtra os chamados por perfil | `filter()`, condições |
| `filterTickets()` | Combina texto, status, prioridade, categoria | `filter()`, `&&`, `||` |
| `ticketActivity()` | Conta aberturas e resoluções por dia | datas, `filter()` |
| `availableInvite()` | Confere prazo e uso de convite | `find()`, comparações |
| `randomHex()` / `toHex()` | Geram/formatam token fictício | Web Crypto, números hexadecimais |
| `passwordDigest()` | Deriva hash da senha com PBKDF2 e salt | `async/await`, Web Crypto |

## 5. Funções de public.js

- `portalSlides`: array com três imagens, títulos e legendas.
- `presentationPage()`: monta o conteúdo institucional e o formulário de contato.
- `setSlide()`: muda a imagem e a legenda quando se clica no carrossel.
- `loginPage()`: monta o formulário de login.
- `activationPage()`: monta a primeira entrada por convite ou informa que ele é inválido.

O formulário de contato só valida os campos. Ele **não envia mensagem** a servidor algum.

## 6. Funções de app.js por tema

### Início e sessão

- `workspace = loadWorkspace(localStorage)`: carrega os dados logo no início.
- `readSession()`, `setSession()`, `endSession()`: gerenciam o perfil demonstrativo na aba.
- `account()`, `user()`, `visibleTickets()`: identificam perfil e chamados que a interface deve exibir.
- `route()`, `goTo()`, `render()`: organizam navegação e atualizam a tela sem recarregar o site.

### Visualização

- `statsFor()`: calcula os indicadores dos chamados.
- `summary()`: monta os cartões do dashboard.
- `activity()`: monta o gráfico diário.
- `distribution()`: monta o gráfico circular por status.
- `ticketTable()`: cria a tabela dos chamados.
- `reports()`: apresenta relatórios.
- `notify()`: exibe aviso de erro ou sucesso.
- `setTheme()` e `applyAppearance()`: controlam tema e tamanho da fonte.
- `setMenu()`: abre/fecha navegação móvel.

### Trabalho com chamados

- `newTicket()`: abre formulário, lê dados com `FormData`, valida, gera ID usando `workspace.nextId++`, insere com `push()` e salva.
- `openTicket()`: mostra detalhes. Técnicos podem responder, alterar status e prioridade.
- `filterTickets()` (em data.js): seleciona apenas os resultados compatíveis com os filtros.
- `renderTicketResults()`: apresenta na tela a lista filtrada.
- `save()`: converte o `workspace` em JSON e grava no navegador.

### Contas e equipe

- `team()`: mostra perfis e convites.
- `newInvitation()`: cria convite local com prazo de 24 horas.
- `renewInvitation()`: renova um convite expirado.
- `copyInvitation()`: copia o link.
- `activateAccount()`: ativa perfil fictício e grava a derivação de senha local.
- `logIn()`: compara credenciais demonstrativas e inicia a sessão.
- `saveProfile()`: atualiza dados e foto de perfil.

### Eventos

Os `addEventListener()` no final do `app.js` reagem a cliques, digitação, envio de formulário e mudanças dos controles.

`event.preventDefault()` impede que o navegador realize o envio tradicional do formulário e recarregue a página.

`event.target.closest('[data-action]')` descobre qual botão foi clicado, inclusive quando o botão foi criado dinamicamente.

## 7. Conceitos rápidos para explicar olhando o código

| Expressão | Significado simples |
|---|---|
| `const` | Declara um identificador que não pode ser reatribuído |
| `let` | Declara um identificador que pode receber outro valor |
| `function` | Agrupa instruções que podem ser executadas quando chamadas |
| `return` | Devolve o resultado e encerra a execução da função |
| `if` | Só executa o bloco se a condição for verdadeira |
| `map()` | Produz uma nova lista transformando cada item |
| `filter()` | Produz uma lista contendo apenas itens que passam no teste |
| `find()` | Encontra o primeiro item compatível |
| `push()` | Adiciona item no final de um array |
| `.length` | Quantidade de itens ou caracteres |
| `&&` | Operador lógico E |
| `||` | Operador lógico OU |
| `??` | Usa outro valor se o primeiro for `null` ou `undefined` |
| `===` | Comparação estrita |
| `...` | Espalha/copias propriedades ou elementos |
| `async/await` | Espera a conclusão de uma operação assíncrona |
| `JSON.stringify()` | Transforma objeto em texto JSON |
| `JSON.parse()` | Transforma texto JSON em dados JavaScript |
| `localStorage` | Salva dados no navegador de modo persistente |
| `sessionStorage` | Guarda dados durante a sessão da aba |
| `FormData` | Lê os valores preenchidos em um formulário |
| `querySelector()` | Localiza um elemento HTML |
| `addEventListener()` | Associa uma reação a um evento (clique, digitação etc.) |
| `aria-label` | Dá nome acessível a controles para leitores de tela |
| `@media` | Cria ajustes de layout de acordo com a tela |

## 8. Arquivos que não aceitam comentários de código

**package.json:** é JSON estrito e **não permite comentários `//` ou `/* */`**. O script `dev` inicia um servidor local com Python; o `check` verifica a sintaxe dos três arquivos JavaScript com Node.js.

**.nojekyll:** é um arquivo marcador usado pelo GitHub Pages para não processar o site com Jekyll. Não precisa de código dentro.

**assets/**: fotos e fontes são arquivos binários, não recebem comentários de código. Consulte `assets/LEIA-ME.md` para entender os recursos e as fontes.

**README.md:** é a documentação do projeto e descreve como executar, demonstrar, testar e publicar.

## 9. Roteiro para explicar um novo chamado ao professor

1. Abra o formulário de **Novo chamado**.
2. Mostre `newTicket()` em `app.js`. Explique que `FormData` lê o que foi digitado.
3. A função verifica comprimento mínimo e seleciona categoria/prioridade.
4. `workspace.nextId++` gera o ID; o objeto começa com status `Aberto`.
5. `workspace.tickets.push(ticket)` acrescenta o chamado ao estado em memória.
6. `finishChange()` tenta salvar e atualiza a visualização.
7. `save()` usa `JSON.stringify()` e `localStorage.setItem()`.
8. `render()` mostra o novo registro e os indicadores atualizados.

Se a banca perguntar por segurança, diga que a autenticação é simulada e os dados não são sincronizados, porque é um protótipo acadêmico de interface.

**Orientação acadêmica:** o professor exige que a redação de uma das partes seja feita *sem uso de IA*. Este guia é material de estudo do código; a redação individual deve ser escrita por você.
