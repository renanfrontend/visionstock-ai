import type { MetadataRoute } from "next";

/**
 * Search engines may index the demo; crawlers that collect content to train AI models may not.
 * robots.txt is a request, not an enforcement mechanism: the LICENSE is what forbids that use.
 */
const AI_TRAINING_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "meta-externalagent",
  "cohere-training-data-crawler",
  "Diffbot",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: [...AI_TRAINING_CRAWLERS], disallow: "/" },
      { userAgent: "*", allow: "/", disallow: "/api/" },
    ],
  };
}
