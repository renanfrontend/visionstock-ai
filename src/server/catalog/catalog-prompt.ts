export const CATALOG_SYSTEM_PROMPT =
  "Você é um assistente de e-commerce e catalogação. Analise a imagem fornecida. " +
  "Identifique o produto principal, suas características (cor, material, estilo) e o contexto de uso. " +
  "Retorne APENAS um objeto JSON válido com as chaves: 'title', 'description', 'category', " +
  "'colors' (array) e 'seoTags' (array com 5 palavras).";

const OUTPUT_RULES = "Escreva em português do Brasil. Responda somente com o JSON, sem markdown.";

/** Frames from a short video show the same product from several angles. */
export function catalogInstruction(source: "photo" | "video", imageCount: number): string {
  if (source === "video" && imageCount > 1) {
    return (
      `As ${imageCount} imagens são quadros de um vídeo curto do MESMO produto, em ângulos diferentes. ` +
      "Combine os detalhes visíveis em todos os quadros e gere um único cadastro. " +
      OUTPUT_RULES
    );
  }
  return `Gere o cadastro do produto desta imagem. ${OUTPUT_RULES}`;
}
