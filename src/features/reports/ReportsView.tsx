"use client";

import { ArchiveRestore, Download, Eye, FileCode2, FileJson, FileSpreadsheet, RotateCcw, Save, Trash2, Upload, type LucideIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CatalogStateSchema, StoreSettingsSchema } from "@/application/catalog/catalog-state";
import { updateSettings } from "@/application/catalog/commands";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { TextField } from "@/components/ui/fields";
import { Odometer } from "@/components/ui/Odometer";
import { buildCsv } from "@/core/reports/csv";
import { summarize } from "@/core/reports/summary";
import { buildInventoryXml, buildMerchantFeedXml } from "@/core/reports/xml";
import { formatBRL } from "@/core/shared/money";
import { useCatalog, useCatalogStore } from "../app/CatalogProvider";
import { byteSize, downloadText, fileStamp } from "../shared/download";
import { formatInt } from "../shared/format";
import { ProductTable } from "./ProductTable";
import { XmlPreview } from "./XmlPreview";

type ExportId = "inventory" | "feed" | "csv" | "backup";

interface ExportSpec {
  id: ExportId;
  title: string;
  description: string;
  icon: LucideIcon;
  extension: string;
  mime: string;
  previewable: boolean;
}

const EXPORTS: readonly ExportSpec[] = [
  {
    id: "inventory",
    title: "Inventário em XML",
    description: "Todos os produtos com preço, custo, saldo, endereço e qualidade. Para ERP e auditoria.",
    icon: FileCode2,
    extension: "xml",
    mime: "application/xml",
    previewable: true,
  },
  {
    id: "feed",
    title: "Feed da loja em XML",
    description: "Produtos publicados no padrão RSS do Google Merchant, aceito por marketplaces e anúncios.",
    icon: FileCode2,
    extension: "xml",
    mime: "application/xml",
    previewable: true,
  },
  {
    id: "csv",
    title: "Planilha CSV",
    description: "Separada por ponto e vírgula, abre direto no Excel e no Google Planilhas em português.",
    icon: FileSpreadsheet,
    extension: "csv",
    mime: "text/csv",
    previewable: false,
  },
  {
    id: "backup",
    title: "Backup em JSON",
    description: "Catálogo completo com histórico de estoque, para restaurar em outro navegador.",
    icon: FileJson,
    extension: "json",
    mime: "application/json",
    previewable: false,
  },
];

const FILE_PREFIX: Record<ExportId, string> = {
  inventory: "inventario",
  feed: "feed-loja",
  csv: "produtos",
  backup: "visionstock-backup",
};

export function ReportsView() {
  const store = useCatalogStore();
  const state = useCatalog((s) => s);
  const { products, settings } = state;
  const summary = useMemo(() => summarize(products), [products]);
  const [preview, setPreview] = useState<ExportId>("inventory");
  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeUrl, setStoreUrl] = useState(settings.storeUrl);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const restoreInput = useRef<HTMLInputElement>(null);

  const contents = useMemo<Record<ExportId, string>>(() => {
    const generatedAt = new Date().toISOString();
    return {
      inventory: buildInventoryXml(products, { storeName: settings.storeName, generatedAt }),
      feed: buildMerchantFeedXml(products, settings),
      csv: buildCsv(products),
      backup: JSON.stringify(state, null, 2),
    };
  }, [products, settings, state]);

  const exportFile = (spec: ExportSpec) => {
    downloadText(contents[spec.id], `${FILE_PREFIX[spec.id]}-${fileStamp()}.${spec.extension}`, spec.mime);
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = CatalogStateSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) throw new Error("schema");
      store.replace(parsed.data, { tone: "success", title: "Backup restaurado", detail: `${parsed.data.products.length} produtos carregados de ${file.name}.` });
    } catch {
      store.notify({ tone: "error", title: "Backup inválido", detail: "O arquivo não é um backup do VisionStock ou está corrompido." });
    }
  };

  const saveSettings = () => {
    const parsed = StoreSettingsSchema.safeParse({ storeName: storeName.trim(), storeUrl: storeUrl.trim() });
    if (!parsed.success) {
      setSettingsError("Informe um nome e um endereço completo, como https://loja.acmecorp.com.br.");
      return;
    }
    setSettingsError(null);
    store.run((current) => updateSettings(current, parsed.data));
  };

  const kpis = [
    { label: "SKUs", value: formatInt(summary.skus) },
    { label: "Unidades", value: formatInt(summary.units) },
    { label: "Estoque a custo", value: formatBRL(summary.stockCostCents) },
    { label: "Estoque a preço de venda", value: formatBRL(summary.stockValueCents) },
    { label: "Publicados", value: formatInt(summary.published) },
    { label: "Repor estoque", value: formatInt(summary.lowStock + summary.outOfStock), tone: summary.lowStock + summary.outOfStock ? "text-amber" : "" },
    { label: "Sem endereço", value: formatInt(summary.unallocated), tone: summary.unallocated ? "text-amber" : "" },
    { label: "Qualidade média", value: `${summary.averageQuality}%` },
  ];

  const previewSpec = EXPORTS.find((spec) => spec.id === preview);

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="max-w-2xl text-sm text-ink-muted">Indicadores do catálogo e exportações para integrar com ERP, loja virtual e planilhas.</p>
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass rounded-xl px-4 py-3">
            <dt className="text-xs text-ink-muted">{kpi.label}</dt>
            <dd className={`mt-1 font-display text-lg font-semibold sm:text-xl ${kpi.tone ?? "text-ink"}`}>
              <Odometer value={kpi.value} />
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="exports-title" className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0 space-y-3">
          <h2 id="exports-title" className="font-display text-base font-semibold">
            Exportar
          </h2>
          <ul className="space-y-3">
            {EXPORTS.map((spec) => {
              const Icon = spec.icon;
              const selected = preview === spec.id;
              return (
                <li key={spec.id} className={`glass rounded-xl p-4 transition-colors ${selected ? "!border-ice/40" : ""}`}>
                  <div className="flex gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ice/10 text-ice">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-ink">
                        {spec.title}
                        <span className="font-mono text-[11px] font-normal text-ink-faint">{byteSize(contents[spec.id])}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">{spec.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    {spec.previewable ? (
                      <Button size="sm" variant="ghost" icon={Eye} onClick={() => setPreview(spec.id)} aria-pressed={selected}>
                        Prévia
                      </Button>
                    ) : null}
                    <Button size="sm" icon={Download} onClick={() => exportFile(spec)}>
                      Baixar .{spec.extension}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="min-w-0 space-y-3">
          <h2 className="font-display text-base font-semibold">Prévia</h2>
          {previewSpec ? <XmlPreview xml={contents[previewSpec.id]} title={`${FILE_PREFIX[previewSpec.id]}.${previewSpec.extension}`} /> : null}
          {preview === "feed" && summary.published === 0 ? (
            <p className="text-xs text-amber">O feed só inclui produtos publicados. Publique na aba Vitrine para preenchê-lo.</p>
          ) : null}
        </div>
      </section>

      <ProductTable products={products} />

      <section aria-labelledby="settings-title" className="grid gap-5 lg:grid-cols-2">
        <div className="glass space-y-4 rounded-2xl p-5">
          <h2 id="settings-title" className="font-display text-base font-semibold">
            Dados da loja
          </h2>
          <p className="text-xs text-ink-muted">Usados no cabeçalho dos relatórios e nos links do feed.</p>
          <TextField label="Nome da loja" value={storeName} max={80} onChange={setStoreName} />
          <TextField label="Endereço da loja" value={storeUrl} onChange={setStoreUrl} mono error={settingsError} />
          <div className="flex justify-end">
            <Button icon={Save} onClick={saveSettings}>
              Salvar dados da loja
            </Button>
          </div>
        </div>

        <div className="glass space-y-4 rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold">Dados deste navegador</h2>
          <p className="text-xs text-ink-muted">O catálogo fica salvo localmente. Use o backup JSON para levar a outro navegador.</p>
          <input ref={restoreInput} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} onChange={(event) => {
            void restore(event.target.files?.[0]);
            event.target.value = "";
          }} />
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" icon={Upload} onClick={() => restoreInput.current?.click()}>
              Restaurar backup
            </Button>
            <ConfirmButton icon={ArchiveRestore} variant="ghost" label="Recarregar demonstração" confirmLabel="Substituir o catálogo?" onConfirm={() => store.resetToDemo()} />
            <ConfirmButton icon={Trash2} label="Apagar tudo" confirmLabel="Confirmar exclusão" onConfirm={() => store.clearAll()} />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-ink-faint">
            <RotateCcw className="size-3" aria-hidden="true" />
            Recarregar a demonstração devolve os 8 produtos de exemplo.
          </p>
        </div>
      </section>
    </div>
  );
}
