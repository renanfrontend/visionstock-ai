import { isValidGtin } from "@/core/catalog/gtin";
import { canTransition } from "@/core/catalog/pipeline";
import { PRODUCT_STATUS_LABEL, type Product, type ProductInput, type ProductStatus, type SalesChannel } from "@/core/catalog/product";
import { generateSku, normalizeSku, SKU_PATTERN } from "@/core/catalog/sku";
import { applyMovement, MOVEMENT_LABEL, type MovementType, type StockMovement } from "@/core/inventory/stock";
import { checkAllocation, formatBin } from "@/core/inventory/warehouse";
import type { CatalogState, StoreSettings } from "./catalog-state";

export interface CommandContext {
  now: string;
  newId: () => string;
}

export type NoticeTone = "success" | "error" | "info";

export interface Notice {
  tone: NoticeTone;
  title: string;
  detail?: string;
}

export interface CommandResult {
  ok: boolean;
  state: CatalogState;
  notice: Notice;
  /** Product affected, used by the UI to focus or animate it. */
  productId?: string;
}

const fail = (state: CatalogState, title: string, detail?: string): CommandResult => ({
  ok: false,
  state,
  notice: { tone: "error", title, detail },
});

function findProduct(state: CatalogState, id: string): Product | undefined {
  return state.products.find((product) => product.id === id);
}

function replaceProduct(state: CatalogState, next: Product): CatalogState {
  return { ...state, products: state.products.map((product) => (product.id === next.id ? next : product)) };
}

/** Field-level validation shared by create and update. Returns the first problem found. */
function validateInput(state: CatalogState, input: ProductInput, sku: string, ignoreId?: string): string | null {
  if (input.title.trim().length < 3) return "Informe um título com pelo menos 3 caracteres.";
  if (!SKU_PATTERN.test(sku)) return "O SKU deve ter letras e números separados por hífen, como CAS-CANE-0001.";
  if (state.products.some((product) => product.sku === sku && product.id !== ignoreId)) return `O SKU ${sku} já está em uso.`;
  if (input.gtin && !isValidGtin(input.gtin)) return "O EAN informado tem dígito verificador inválido.";
  if (input.priceCents < 0 || input.costCents < 0) return "Preço e custo não podem ser negativos.";
  if (!Number.isInteger(input.minimumQuantity) || input.minimumQuantity < 0) return "O estoque mínimo deve ser um número inteiro.";
  return null;
}

const cleanList = (values: readonly string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

function fieldsFrom(input: ProductInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    brand: input.brand.trim(),
    gtin: input.gtin.trim(),
    colors: cleanList(input.colors),
    seoTags: cleanList(input.seoTags).slice(0, 5),
    priceCents: input.priceCents,
    costCents: input.costCents,
    weightGrams: input.weightGrams,
    imageDataUrl: input.imageDataUrl,
    mediaKind: input.mediaKind,
  };
}

export interface CreateMeta {
  source: Product["source"];
  aiModel: string | null;
}

export function createProduct(state: CatalogState, input: ProductInput, meta: CreateMeta, ctx: CommandContext): CommandResult {
  const sku = input.sku
    ? normalizeSku(input.sku)
    : generateSku(input.category, input.title, state.products.map((product) => product.sku));
  const problem = validateInput(state, input, sku);
  if (problem) return fail(state, "Não foi possível salvar o produto", problem);
  if (!Number.isInteger(input.initialQuantity) || input.initialQuantity < 0) {
    return fail(state, "Não foi possível salvar o produto", "O estoque inicial deve ser um número inteiro.");
  }

  const product: Product = {
    id: ctx.newId(),
    sku,
    ...fieldsFrom(input),
    status: "draft",
    channels: [],
    stock: { quantity: input.initialQuantity, minimum: input.minimumQuantity, binId: null },
    source: meta.source,
    aiModel: meta.aiModel,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    publishedAt: null,
  };

  const movements: StockMovement[] =
    input.initialQuantity > 0
      ? [
          {
            id: ctx.newId(),
            productId: product.id,
            type: "entrada",
            quantity: input.initialQuantity,
            before: 0,
            after: input.initialQuantity,
            note: "Saldo inicial do cadastro",
            at: ctx.now,
          },
        ]
      : [];

  return {
    ok: true,
    state: { ...state, products: [product, ...state.products], movements: [...movements, ...state.movements] },
    notice: { tone: "success", title: "Produto cadastrado", detail: `${product.sku} entrou como rascunho. Agora enderece no armazém.` },
    productId: product.id,
  };
}

export function updateProduct(state: CatalogState, id: string, input: ProductInput, ctx: CommandContext): CommandResult {
  const current = findProduct(state, id);
  if (!current) return fail(state, "Produto não encontrado");
  const sku = input.sku ? normalizeSku(input.sku) : current.sku;
  const problem = validateInput(state, input, sku, id);
  if (problem) return fail(state, "Não foi possível salvar as alterações", problem);

  const next: Product = {
    ...current,
    sku,
    ...fieldsFrom(input),
    stock: { ...current.stock, minimum: input.minimumQuantity },
    updatedAt: ctx.now,
  };

  // A published product edited below the publication gates goes back to draft.
  const demoted = next.status !== "draft" && !canTransitionFromDraft(next, next.status);
  const finalProduct = demoted ? { ...next, status: "draft" as const, channels: [] } : next;

  return {
    ok: true,
    state: replaceProduct(state, finalProduct),
    notice: demoted
      ? { tone: "info", title: "Alterações salvas", detail: "O cadastro deixou de cumprir os requisitos e voltou para rascunho." }
      : { tone: "success", title: "Alterações salvas", detail: finalProduct.sku },
    productId: id,
  };
}

function canTransitionFromDraft(product: Product, to: ProductStatus): boolean {
  return canTransition({ ...product, status: "draft" }, to).allowed;
}

export function deleteProduct(state: CatalogState, id: string): CommandResult {
  const current = findProduct(state, id);
  if (!current) return fail(state, "Produto não encontrado");
  return {
    ok: true,
    state: {
      ...state,
      products: state.products.filter((product) => product.id !== id),
      movements: state.movements.filter((movement) => movement.productId !== id),
    },
    notice: { tone: "info", title: "Produto excluído", detail: `${current.sku} e o histórico de estoque foram removidos.` },
  };
}

export function allocateProduct(state: CatalogState, id: string, binId: string, ctx: CommandContext): CommandResult {
  const current = findProduct(state, id);
  if (!current) return fail(state, "Produto não encontrado");
  if (current.stock.binId === binId) return { ok: true, state, notice: { tone: "info", title: "Nada mudou", detail: `${current.sku} já está em ${formatBin(binId)}.` }, productId: id };

  const check = checkAllocation(current, binId, state.products);
  if (!check.allowed) return fail(state, "Endereço indisponível", check.reason);

  const moved = current.stock.binId !== null;
  return {
    ok: true,
    state: replaceProduct(state, { ...current, stock: { ...current.stock, binId }, updatedAt: ctx.now }),
    notice: { tone: "success", title: moved ? "Produto transferido" : "Produto endereçado", detail: `${current.sku} em ${formatBin(binId)}.` },
    productId: id,
  };
}

export function releaseBin(state: CatalogState, id: string, ctx: CommandContext): CommandResult {
  const current = findProduct(state, id);
  if (!current?.stock.binId) return fail(state, "O produto não está endereçado");
  if (current.status === "published") return fail(state, "Produto publicado", "Tire o produto da vitrine antes de liberar o endereço.");
  return {
    ok: true,
    state: replaceProduct(state, { ...current, stock: { ...current.stock, binId: null }, updatedAt: ctx.now }),
    notice: { tone: "info", title: "Endereço liberado", detail: `${formatBin(current.stock.binId)} está vazio.` },
    productId: id,
  };
}

export function moveStock(
  state: CatalogState,
  id: string,
  type: MovementType,
  quantity: number,
  note: string,
  ctx: CommandContext,
): CommandResult {
  const current = findProduct(state, id);
  if (!current) return fail(state, "Produto não encontrado");
  const result = applyMovement(current.stock.quantity, type, quantity);
  if (!result.ok) return fail(state, `${MOVEMENT_LABEL[type]} recusada`, result.reason);

  const movement: StockMovement = {
    id: ctx.newId(),
    productId: id,
    type,
    quantity,
    before: current.stock.quantity,
    after: result.after,
    note: note.trim().slice(0, 200),
    at: ctx.now,
  };
  let next: Product = { ...current, stock: { ...current.stock, quantity: result.after }, updatedAt: ctx.now };
  const soldOut = next.status === "published" && result.after === 0;
  if (soldOut) next = { ...next, status: "ready" };

  return {
    ok: true,
    state: { ...replaceProduct(state, next), movements: [movement, ...state.movements] },
    notice: soldOut
      ? { tone: "info", title: "Estoque zerado", detail: `${current.sku} saiu da vitrine até receber nova entrada.` }
      : { tone: "success", title: `${MOVEMENT_LABEL[type]} registrada`, detail: `Saldo de ${current.sku}: ${current.stock.quantity} → ${result.after} un.` },
    productId: id,
  };
}

export function transitionProduct(state: CatalogState, id: string, to: ProductStatus, ctx: CommandContext): CommandResult {
  const current = findProduct(state, id);
  if (!current) return fail(state, "Produto não encontrado");
  const check = canTransition(current, to);
  if (!check.allowed) return fail(state, `Ainda não pode ir para "${PRODUCT_STATUS_LABEL[to]}"`, check.reasons.join(" "));

  const publishing = to === "published";
  const next: Product = {
    ...current,
    status: to,
    channels: publishing && current.channels.length === 0 ? ["loja"] : current.channels,
    publishedAt: publishing ? ctx.now : current.publishedAt,
    updatedAt: ctx.now,
  };
  const titles: Record<ProductStatus, string> = {
    draft: "Voltou para rascunho",
    ready: "Pronto para venda",
    published: "Publicado na vitrine",
  };
  return { ok: true, state: replaceProduct(state, next), notice: { tone: "success", title: titles[to], detail: current.title }, productId: id };
}

export function toggleChannel(state: CatalogState, id: string, channel: SalesChannel, ctx: CommandContext): CommandResult {
  const current = findProduct(state, id);
  if (!current) return fail(state, "Produto não encontrado");
  const enabled = current.channels.includes(channel);
  if (enabled && current.status === "published" && current.channels.length === 1) {
    return fail(state, "Mantenha pelo menos um canal", "Para tirar o produto de todos os canais, volte-o para Pronto.");
  }
  const channels = enabled ? current.channels.filter((item) => item !== channel) : [...current.channels, channel];
  return {
    ok: true,
    state: replaceProduct(state, { ...current, channels, updatedAt: ctx.now }),
    notice: { tone: "info", title: enabled ? "Canal desativado" : "Canal ativado", detail: current.sku },
    productId: id,
  };
}

export function updateSettings(state: CatalogState, settings: StoreSettings): CommandResult {
  return { ok: true, state: { ...state, settings }, notice: { tone: "success", title: "Dados da loja atualizados" } };
}
