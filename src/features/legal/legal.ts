/** Single source for authorship and legal links shown across the app. */
export const AUTHOR = {
  name: "Renan Augusto dos Santos",
  siteUrl: "https://renanaugusto.com.br",
  email: "contato@renanaugusto.com.br",
  githubUrl: "https://github.com/renanfrontend",
} as const;

export const REPOSITORY_URL = "https://github.com/renanfrontend/visionstock-ai";
export const PRIVACY_PATH = "/privacidade";
export const COPYRIGHT_YEAR = 2026;
export const COPYRIGHT_NOTICE = `© ${COPYRIGHT_YEAR} ${AUTHOR.name}. Todos os direitos reservados.`;

export const PRIVACY_UPDATED_AT = { iso: "2026-10-07", label: "7 de outubro de 2026" } as const;

export const GEMINI_TERMS_URL = "https://ai.google.dev/gemini-api/terms";
export const VERCEL_PRIVACY_URL = "https://vercel.com/legal/privacy-notice";
