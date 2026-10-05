export const CATALOG_SYSTEM_PROMPT =
  "Você é um assistente de e-commerce e catalogação. Analise a imagem fornecida. " +
  "Identifique o produto principal, suas características (cor, material, estilo) e o contexto de uso. " +
  "Retorne APENAS um objeto JSON válido com as chaves: 'title', 'description', 'category', " +
  "'colors' (array) e 'seoTags' (array com 5 palavras).";

export const CATALOG_USER_INSTRUCTION =
  "Gere o cadastro do produto desta imagem em português do Brasil. Responda somente com o JSON, sem markdown.";
