# COREdesk v2

Central de chamados de TI feita em HTML, CSS e JavaScript. A interface inclui visão geral, fila de chamados com busca e filtros, relatórios, preferências e troca de perfil.

## Como abrir

1. Baixe e extraia o ZIP do projeto ou clone o repositório.
2. No VS Code, abra a pasta que contém `index.html`.
3. Abra `index.html` em um navegador moderno. Para usar um servidor local, execute `npm run dev` com Node.js e Python 3 instalados e acesse `http://localhost:4321`.

A interface abre com chamados fictícios. **Novo chamado** registra uma solicitação. Na fila, abra um chamado para ler a descrição e, no perfil técnico ou administrador, alterar o status e a prioridade. Use o seletor no rodapé do menu lateral para testar a visão de colaborador.

No perfil **Administrador**, abra **Equipe → Convidar** e depois **Abrir convite** para simular o primeiro acesso. O convite dura 24 horas e só pode ser aceito uma vez no navegador onde foi criado.

## Dados

Chamados, convites, perfil escolhido e tema são gravados em `localStorage` na chave `coredesk-v2-workspace`. O portal é uma demonstração estática sem autenticação, banco de dados ou sincronização entre dispositivos. Use dados fictícios.

## Verificação e hospedagem

- `npm run check` verifica a sintaxe dos arquivos JavaScript.
- No GitHub Pages, selecione a branch `main` e a pasta `/ (root)` como origem. A publicação usa apenas os arquivos estáticos, sem etapa de build.

A fonte Manrope e os ícones Material Symbols Rounded são distribuídos com suas licenças na pasta `assets`.
