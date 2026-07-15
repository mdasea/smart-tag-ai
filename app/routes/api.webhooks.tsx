import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const OPENCODE_GO_URL = "https://opencode.ai/zen/go/v1/chat/completions";
const OPENCODE_GO_MODEL = "qwen3.7-plus";

async function generateTags(title: string, bodyHtml: string): Promise<string> {
  const response = await fetch(OPENCODE_GO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENCODE_GO_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENCODE_GO_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an e-commerce SEO expert. Return ONLY 5 comma-separated tags. No explanations, no markdown, no extra text.",
        },
        {
          role: "user",
          content: `Product title: "${title}"\nProduct description: "${bodyHtml}"\n\nGenerate exactly 5 SEO-optimized product tags:`,
        },
      ],
      temperature: 0.3,
      max_tokens: 80,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenCode Go API error: ${response.status} ${await response.text()}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "AI-optimized";
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload, admin } = await authenticate.webhook(request);

  if (!admin) {
    throw new Response("Unauthorized", { status: 401 });
  }

  if (topic === "PRODUCTS_CREATE") {
    const product = payload as any;
    const productId = product.admin_graphql_api_id;
    const imageUrl = product.images?.[0]?.src || null;

    const suggestedTags = await generateTags(
      product.title || "Untitled Product",
      product.body_html || ""
    );

    await db.pendingTag.create({
      data: {
        shop,
        productId,
        productTitle: product.title,
        imageUrl,
        suggestedTags,
        status: "PENDING",
      },
    });
  }

  return new Response();
};
