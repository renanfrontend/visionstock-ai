# VisionStock

**Demo:** https://visionstock-ai-nine.vercel.app

> © 2026 Renan Augusto dos Santos. **Todos os direitos reservados.** Código público apenas para avaliação de portfólio: copiar, adaptar ou reutilizar exige autorização por escrito. Veja [Licença e direitos autorais](#licença-e-direitos-autorais).

Prova de conceito de um sistema de catálogo para e-commerce: da foto (ou de um vídeo curto) do produto até o estoque endereçado, a vitrine publicada e os relatórios em XML. A IA preenche o cadastro; a interface transforma o resto do fluxo em algo direto e interativo.

## O que dá para fazer

| Aba | Fluxo |
| --- | --- |
| **Cadastro** | Envie foto, cole com Ctrl+V, abra a **câmera** ou grave/envie um **vídeo de até 10 s**. O modelo de visão preenche título, descrição, categoria, cores e tags; você completa SKU (gerado automaticamente), marca, EAN (validado pelo dígito verificador), preço, custo, estoque e peso. Um medidor de qualidade mostra o que falta. |
| **Armazém 3D** | Maquete com 3 ruas × 3 níveis × 4 posições. **Arraste o produto da fila até uma prateleira**: a cena indica em tempo real se o endereço aceita (verde) ou não (vermelho) e as caixas caem no lugar. Camada de calor por situação de estoque, entradas, saídas e ajustes com histórico. |
| **Vitrine** | Quadro Rascunho → Pronto → Publicado com arrastar e soltar. Cada etapa tem requisitos (qualidade ≥ 70% e preço; estoque e endereço) e o card mostra o que falta. Prévia da loja virtual com cards em 3D que inclinam e viram. |
| **Relatórios** | Indicadores, tabela com busca/filtros/ordenação e exportação em **XML de inventário**, **feed XML no padrão Google Merchant**, **CSV** (pt-BR) e **backup JSON** com restauração. |

Atalhos: `1`–`4` trocam de aba; no armazém, `H` liga a camada de estoque, `R` recentra a câmera e `Esc` limpa a seleção. Tudo também funciona sem arrastar (toque/teclado).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript estrito · Tailwind CSS v4 · React Three Fiber + drei · Framer Motion · zod · Vitest. Visão computacional via **Gemini API** (REST, camada gratuita) ou **Anthropic SDK**.

## Arquitetura

```
src/
├── core/                      # Domínio puro, sem React nem I/O (testado)
│   ├── catalog/               # Produto, SKU, EAN/GTIN, qualidade, regras de etapa, contrato da API
│   ├── inventory/             # Endereços do armazém, capacidade, movimentações de estoque
│   ├── reports/               # Resumo, XML de inventário, feed Merchant, CSV
│   └── shared/                # Dinheiro em centavos, texto
├── application/catalog/       # Casos de uso como comandos puros: (estado, comando) → estado + aviso
│   ├── commands.ts            # criar, editar, endereçar, movimentar, publicar, canais…
│   ├── catalog-store.ts       # Store agnóstico de framework (useSyncExternalStore)
│   └── catalog-repository.ts  # Porta de persistência
├── infrastructure/            # Adapter localStorage com validação por schema
├── server/catalog/            # Porta VisionModel + adapters Gemini e Anthropic
├── app/api/analyze-image/     # Rota HTTP fina: valida, chama o caso de uso, mapeia erros
└── features/                  # UI por contexto: register, media, warehouse, storefront, reports
```

Decisões que valem a leitura:

- **Vídeo vira quadros no navegador.** O clipe é limitado a 10 s, quatro quadros espaçados são extraídos via canvas e o mais nítido (variância do Laplaciano) vira a capa. O modelo recebe os quadros como ângulos do mesmo produto: funciona com qualquer provedor multimodal e cabe no limite de 4,5 MB das funções serverless.
- **Comandos puros com avisos.** Cada ação devolve o novo estado e uma mensagem (`sucesso`, `info`, `erro`) com o motivo. A interface só reage: toasts, tremor no card, flash vermelho na prateleira.
- **Regras de negócio no domínio.** Um SKU por endereço, capacidade por posição, saldo nunca negativo, publicação exige estoque e endereço, produto esgotado sai da vitrine. Tudo testado sem renderizar nada.
- **Arrastar e soltar do DOM para o 3D.** O drop HTML5 é convertido em raycast na câmera da cena para achar o endereço sob o cursor.
- **Persistência atrás de uma porta.** A demo salva no navegador; trocar por uma API é escrever outro adapter de `CatalogRepository`.
- **Saída do LLM é entrada não confiável.** JSON extraído com tolerância e validado com zod antes de chegar à tela.

## Rodando localmente

```bash
cp .env.example .env.local   # preencha GEMINI_API_KEY (gratuita) ou ANTHROPIC_API_KEY
npm install
npm run dev
```

| Script | |
| --- | --- |
| `npm test` | Testes de domínio e aplicação (Vitest) |
| `npm run typecheck` | TypeScript estrito |
| `npm run lint` | ESLint |
| `npm run build` | Build de produção |

### Variáveis de ambiente

| Variável                 | Quando usar                               | Padrão              |
| ------------------------ | ----------------------------------------- | ------------------- |
| `GEMINI_API_KEY`         | Gemini (camada gratuita no AI Studio)     | —                   |
| `GEMINI_MODEL`           | opcional                                  | `gemini-3.6-flash`  |
| `ANTHROPIC_API_KEY`      | Anthropic                                 | —                   |
| `ANTHROPIC_WORKSPACE_ID` | só para chaves sem workspace              | —                   |
| `ANTHROPIC_MODEL`        | opcional                                  | `claude-sonnet-5-5` |
| `VISION_PROVIDER`        | força `gemini` ou `anthropic`             | automático          |

## API

`POST /api/analyze-image`

```json
{ "images": [{ "data": "<base64>", "mediaType": "image/jpeg" }], "source": "photo" }
```

`images` aceita de 1 a 4 itens (`source: "video"` para quadros de vídeo). A resposta traz `title`, `description`, `category`, `colors` e `seoTags`, além de modelo, latência e tokens.

## Privacidade

A demonstração não tem contas, cookies nem rastreamento, e o catálogo fica no navegador. As imagens enviadas para análise passam pelo servidor, sem serem gravadas, e seguem para a Gemini API na camada gratuita, cujos termos permitem ao Google usar o conteúdo para melhorar os próprios produtos. A interface avisa isso na área de envio. Política completa, conforme a LGPD: [PRIVACIDADE.md](PRIVACIDADE.md) e [/privacidade](https://visionstock-ai-nine.vercel.app/privacidade).

O `robots.txt` da demo libera buscadores e pede aos crawlers de treinamento de IA que não coletem o site.

## Autoria

Concepção do produto, regras de negócio, arquitetura, interface, cena 3D, ilustrações, textos e vídeos de demonstração por **Renan Augusto dos Santos** ([renanaugusto.com.br](https://renanaugusto.com.br) · [contato@renanaugusto.com.br](mailto:contato@renanaugusto.com.br)). A cena 3D é gerada por código, sem modelos ou texturas de terceiros. Empresas, marcas, produtos e pessoas nos dados de demonstração são fictícios.

## Licença e direitos autorais

© 2026 Renan Augusto dos Santos. **Todos os direitos reservados.**

Este não é um projeto open source. O código está público apenas para fins de portfólio e avaliação profissional. Sem autorização por escrito, não é permitido:

- copiar, modificar, redistribuir ou usar comercialmente o projeto, no todo ou em parte;
- reescrever o projeto em outra stack a partir deste repositório, ou reutilizar a interface, a identidade visual, a cena 3D, os textos e os vídeos;
- apresentar o projeto, ou parte dele, como trabalho próprio em portfólios, processos seletivos ou propostas comerciais;
- usar o conteúdo do repositório ou da demo para treinar ou avaliar modelos de IA.

Os termos completos estão em [LICENSE](LICENSE). Dependências e fontes mantêm suas próprias licenças. Pedidos de autorização: [contato@renanaugusto.com.br](mailto:contato@renanaugusto.com.br). Para reportar uma vulnerabilidade, veja [SECURITY.md](SECURITY.md).

---

## 🇺🇸 English

VisionStock is a product catalog proof of concept by **Renan Augusto dos Santos**: a photo or a 10-second video of a product becomes a reviewed listing, an addressed bin in a 3D warehouse, a published storefront card and XML feeds. Built with Next.js 16, React 19, strict TypeScript, React Three Fiber and the Gemini API. All demo data is fictional.

© 2026 Renan Augusto dos Santos. All rights reserved. This is not open source. The source is public for portfolio evaluation only; copying, modifying, porting, redistributing, commercial use, presenting it as your own work or using it to train AI models requires written permission. See [LICENSE](LICENSE). Contact: [contato@renanaugusto.com.br](mailto:contato@renanaugusto.com.br) · [renanaugusto.com.br](https://renanaugusto.com.br). Privacy policy (Portuguese): [PRIVACIDADE.md](PRIVACIDADE.md).
