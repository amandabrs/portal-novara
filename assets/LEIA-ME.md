# Entendendo a pasta assets

Esta pasta contém recursos visuais e arquivos auxiliares carregados pelo HTML, CSS e JavaScript. Esses arquivos são usados pelo navegador, mas não contêm as funções de negócio do Portal Novara.

| Recurso | Para que serve | Onde aparece |
|---|---|---|
| `equipe.jpg` | Foto do primeiro slide | `public.js`, carrossel |
| `atendimento.jpg` | Foto do segundo slide | `public.js`, carrossel |
| `tecnologia.jpg` | Foto do terceiro slide | `public.js`, carrossel |
| `manrope.woff2` | Fonte dos textos | `styles.css`, regra `@font-face` |
| `symbols.woff2` | Fonte de ícones | `styles.css`, regra `@font-face` |
| Arquivos de licença | Registram direitos de uso dos recursos incluídos | Documentação |

## Como a imagem muda no carrossel

O `public.js` armazena os nomes das imagens no array `portalSlides`. A função `setSlide(index)` atualiza o `src` da imagem com `assets/${slide.image}.jpg` e altera o texto da legenda.

## Por que usar fontes locais?

O `styles.css` contém regras `@font-face` que apontam para os arquivos WOFF2. Assim o navegador baixa a fonte diretamente da pasta do projeto.

## Posso comentar os arquivos JPG e WOFF2?

Não. São formatos de imagem/fonte, não arquivos de programação textual. Inserir comentários dentro deles pode corrompê-los. Por isso, sua função está explicada neste documento.

## Direitos de uso

O README principal informa as fontes de imagens, licenças e referências. Mantenha esses arquivos e as atribuições quando for reutilizar o projeto.
