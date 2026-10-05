# VisionStock AI

**Demo:** https://visionstock-ai-nine.vercel.app

Prova de conceito de **AutoCatálogo Inteligente**: envie a foto de um produto e receba título, descrição, categoria, cores e tags de SEO prontos para revisão, gerados por um LLM multimodal.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** estrito
- **Tailwind CSS v4** com design tokens em `@theme`
- **@react-three/fiber** + **@react-three/drei** para a cena WebGL
- **framer-motion** para transições de estado
- **@anthropic-ai/sdk** para visão computacional
- **zod** para validar o contrato de entrada e a saída do modelo

## Arquitetura

```
src/
├── app/
│   ├── api/analyze-image/route.ts   # Adapter HTTP: valida payload, mapeia erros
│   ├── layout.tsx / page.tsx
│   └── globals.css                  # Tokens, glass, field, skeleton
├── core/catalog/                    # Domínio + contratos (compartilhado client/server)
│   ├── product-draft.ts             # ProductDraftSchema
│   └── analyze-image.contract.ts    # Request/Response tipados
├── server/catalog/
│   ├── vision-model.port.ts         # Porta: qualquer provedor multimodal
│   ├── anthropic-vision.adapter.ts  # Implementação com a SDK da Anthropic
│   ├── analyze-product-image.ts     # Use case: imagem → ProductDraft validado
│   └── catalog-prompt.ts            # System prompt
├── components/
│   ├── three/                       # Cena 3D isolada (carregada via dynamic, ssr: false)
│   └── ui/
└── features/catalog/
    ├── CatalogWorkbench.tsx
    ├── hooks/use-image-analysis.ts  # Máquina de estados (useReducer + AbortController)
    ├── lib/prepare-image.ts         # Downscale para 1568px no browser antes do upload
    └── components/                  # Dropzone, painel, chips, status
```

Decisões relevantes:

- **Porta/adapter para o modelo de visão**: o use case não conhece a Anthropic; trocar de provedor é implementar `VisionModel`.
- **Saída do LLM tratada como input não confiável**: extração tolerante do JSON + validação com zod antes de chegar ao client (`502 INVALID_MODEL_OUTPUT` quando o contrato é violado).
- **Imagem pré-processada no client**: reduz o payload para centenas de KB, abaixo do limite de 4,5 MB do body em funções serverless.
- **Cena 3D fora do bundle inicial** e com `frameloop="never"` quando sai da viewport. Transições usam damping por frame, independente de FPS. Respeita `prefers-reduced-motion`.

## Rodando localmente

```bash
cp .env.example .env.local   # preencha ANTHROPIC_API_KEY
npm install
npm run dev
```

| Variável            | Obrigatória | Padrão              |
| ------------------- | ----------- | ------------------- |
| `ANTHROPIC_API_KEY` | sim         | —                   |
| `ANTHROPIC_MODEL`   | não         | `claude-sonnet-5-5` |
| `ANTHROPIC_WORKSPACE_ID` | só para chaves sem workspace | — |

> O Claude 3.5 Sonnet foi aposentado pela Anthropic; por isso o padrão aponta para o Sonnet atual. Qualquer modelo com visão pode ser fixado via `ANTHROPIC_MODEL`.

## API

`POST /api/analyze-image`

```json
{ "image": "<base64 sem prefixo data:>", "mediaType": "image/jpeg" }
```

Resposta de sucesso:

```json
{
  "ok": true,
  "data": {
    "title": "Caneca de cerâmica Alpha azul-marinho 350 ml",
    "description": "Caneca de cerâmica esmaltada com faixa dourada...",
    "category": "Casa e Cozinha > Canecas",
    "colors": ["Azul-marinho", "Dourado"],
    "seoTags": ["caneca", "ceramica", "cafe", "azul-marinho", "presente"]
  },
  "meta": { "model": "claude-sonnet-5-5", "latencyMs": 3240, "inputTokens": 1612, "outputTokens": 187 }
}
```

## Deploy

```bash
npx vercel --prod --yes
npx vercel env add ANTHROPIC_API_KEY production
```
