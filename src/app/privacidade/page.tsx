import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AUTHOR,
  COPYRIGHT_NOTICE,
  GEMINI_TERMS_URL,
  PRIVACY_UPDATED_AT,
  REPOSITORY_URL,
  VERCEL_PRIVACY_URL,
} from "@/features/legal/legal";

export const metadata: Metadata = {
  title: "Privacidade — VisionStock",
  description: "Como a demonstração do VisionStock trata o catálogo, as imagens enviadas para análise e os dados de acesso.",
};

interface DataRow {
  data: string;
  where: string;
  retention: string;
}

const DATA_ROWS: readonly DataRow[] = [
  {
    data: "Catálogo: produtos, preços, estoque, capas e configurações da loja",
    where: "Só no seu navegador (armazenamento local do site).",
    retention: "Até você apagar.",
  },
  {
    data: "Foto, ou até 4 quadros de um vídeo, enviados para análise",
    where: "Passam pelo servidor da demonstração e seguem para a Google Gemini API.",
    retention: "O servidor não grava. No Google, valem os termos da Gemini API.",
  },
  {
    data: "Imagem da câmera e vídeo gravado",
    where: "Ficam no navegador. O vídeo completo nunca é enviado.",
    retention: "A câmera desliga quando você fecha o painel dela. O vídeo some ao trocar de mídia ou recarregar a página.",
  },
  {
    data: "Dados técnicos de acesso: endereço IP, navegador, horário e página",
    where: "Vercel, que hospeda a demonstração.",
    retention: "Conforme a política de privacidade da Vercel.",
  },
];

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="text-ice underline decoration-ice/40 underline-offset-4 hover:decoration-ice" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="font-display text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 sm:px-6">
      <header className="mb-10 flex items-center justify-between gap-4 border-b border-line pb-4">
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <svg viewBox="0 0 24 24" className="size-6 text-ice" aria-hidden="true">
            <path d="M12 2 21 7v10l-9 5-9-5V7z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 8 16 10.5v5L12 18l-4-2.5v-5z" fill="currentColor" opacity="0.8" />
          </svg>
          <span className="font-display text-sm font-semibold tracking-tight">VisionStock</span>
        </Link>
        <Link href="/" className="text-sm text-ink-muted hover:text-ink">
          Voltar à demonstração
        </Link>
      </header>

      <main className="space-y-10">
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Privacidade</h1>
          <p className="text-sm text-ink-faint">
            Atualizada em <time dateTime={PRIVACY_UPDATED_AT.iso}>{PRIVACY_UPDATED_AT.label}</time>
          </p>
          <p className="text-base leading-relaxed text-ink">
            A demonstração não tem contas, cookies nem rastreamento. O catálogo fica no seu navegador. Só as imagens que você envia para
            análise saem dele, e elas vão para a Google Gemini API. Não envie fotos de pessoas, documentos ou informações confidenciais.
          </p>
        </div>

        <Section id="responsavel" title="Quem é o responsável">
          <p>
            {AUTHOR.name}, autor do projeto, é o controlador dos dados tratados pela demonstração, nos termos da Lei Geral de Proteção de Dados
            (Lei nº 13.709/2018). Contato pelos canais indicados em <ExternalLink href={AUTHOR.profileUrl}>github.com/renanfrontend</ExternalLink>.
          </p>
          <p>O VisionStock é uma prova de conceito para portfólio, com dados fictícios, destinada ao público no Brasil.</p>
        </Section>

        <Section id="dados" title="Quais dados passam pela demonstração">
          <ul className="grid gap-3">
            {DATA_ROWS.map((row) => (
              <li key={row.data} className="glass rounded-xl p-4">
                <p className="font-medium text-ink">{row.data}</p>
                <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[9rem_1fr] sm:gap-x-4">
                  <dt className="text-ink-faint">Onde fica</dt>
                  <dd>{row.where}</dd>
                  <dt className="text-ink-faint">Por quanto tempo</dt>
                  <dd>{row.retention}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="imagens" title="O que acontece com as imagens">
          <p>
            A análise começa assim que você escolhe, cola ou captura uma imagem. Antes do envio, o navegador reduz a imagem e a regrava em JPEG,
            o que descarta os metadados do arquivo original, como a localização GPS. De um vídeo, só saem até 4 quadros.
          </p>
          <p>
            A demonstração usa a camada gratuita da Gemini API. Pelos <ExternalLink href={GEMINI_TERMS_URL}>termos da Gemini API</ExternalLink>,
            o Google pode usar o conteúdo enviado e as respostas para melhorar os próprios produtos, e revisores humanos podem ler esse conteúdo.
            Os servidores do Google podem ficar fora do Brasil, o que configura transferência internacional de dados (LGPD, art. 33).
          </p>
          <p>
            O servidor da demonstração não grava as imagens. Quando algo falha, ele registra só dados técnicos: provedor, modelo, tipo de erro e
            um trecho do texto devolvido pelo modelo. O autor não tem acesso ao que fica com o Google nem como apagar esse conteúdo.
          </p>
        </Section>

        <Section id="nao-fazemos" title="O que a demonstração não faz">
          <ul className="list-disc space-y-1.5 pl-5 marker:text-ink-faint">
            <li>Não tem contas, login nem formulários de contato.</li>
            <li>Não usa cookies, pixels, ferramentas de análise de audiência nem anúncios.</li>
            <li>Não carrega fontes nem scripts de terceiros no navegador: tudo é servido pelo próprio site.</li>
            <li>Não vende, aluga nem compartilha dados com ninguém além do Google (análise das imagens) e da Vercel (hospedagem).</li>
          </ul>
        </Section>

        <Section id="base-legal" title="Base legal">
          <p>
            Imagens enviadas para análise: consentimento (LGPD, art. 7º, I), dado ao escolher a imagem depois do aviso exibido na área de envio.
            Dados técnicos de acesso: legítimo interesse em manter a demonstração segura e funcionando (art. 7º, IX).
          </p>
        </Section>

        <Section id="direitos" title="Seus direitos">
          <p>
            A LGPD (art. 18) garante confirmação e acesso aos dados, correção, eliminação, informação sobre com quem são compartilhados e
            revogação do consentimento. Como o catálogo não fica em servidor, quase tudo se resolve no seu navegador. Para o restante, use o
            contato acima. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
          </p>
          <p>
            A Vercel trata os dados de acesso conforme a <ExternalLink href={VERCEL_PRIVACY_URL}>política de privacidade dela</ExternalLink>.
          </p>
        </Section>

        <Section id="apagar" title="Como apagar seus dados">
          <ol className="list-decimal space-y-1.5 pl-5 marker:text-ink-faint">
            <li>
              Em <strong className="font-medium text-ink">Relatórios</strong>, use <strong className="font-medium text-ink">Apagar tudo</strong>{" "}
              para remover produtos, capas e movimentações.
            </li>
            <li>Para remover também as configurações da loja, limpe os dados deste site nas configurações do navegador.</li>
          </ol>
        </Section>

        <Section id="menores" title="Menores de idade">
          <p>A demonstração não é destinada a menores de 18 anos, idade mínima exigida pelos termos da Gemini API.</p>
        </Section>

        <Section id="alteracoes" title="Alterações">
          <p>
            Mudanças nesta política são publicadas nesta página, com nova data, e ficam registradas no{" "}
            <ExternalLink href={REPOSITORY_URL}>histórico do repositório</ExternalLink>.
          </p>
        </Section>
      </main>

      <footer className="mt-14 border-t border-line pt-4 text-xs text-ink-faint">{COPYRIGHT_NOTICE}</footer>
    </div>
  );
}
