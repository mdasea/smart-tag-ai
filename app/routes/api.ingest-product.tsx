import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const authHeader = request.headers.get("Authorization");
  const expected = `Bearer ${process.env.APP_INGEST_SECRET}`;

  if (authHeader !== expected) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { title, body_html, price, image_url } = body;

  // Validate required fields
  if (!title || !body_html) {
    return Response.json(
      { success: false, error: "title and body_html are required" },
      { status: 400 }
    );
  }

  // TODO: Create product in Shopify sandbox via GraphQL
  // then queue for AI tagging via the webhook path

  return Response.json({
    success: true,
    message: "Product queued for AI tagging",
    product: { title, price },
  });
};
