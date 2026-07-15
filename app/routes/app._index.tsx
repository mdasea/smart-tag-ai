import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import {
  Page,
  Card,
  DataTable,
  Button,
  Thumbnail,
  Banner,
  InlineStack,
  Text,
  BlockStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const auth = await authenticate.admin(request);
  const billing = auth.billing as any;
  const session = auth.session;

  await billing.require({
    plans: ["Pay-As-You-Go AI Tagging"],
    onFailure: async () =>
      billing.request({ plan: "Pay-As-You-Go AI Tagging" }),
  });

  const pendingTags = await db.pendingTag.findMany({
    where: { shop: session.shop, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  return { pendingTags };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const auth = await authenticate.admin(request);
  const admin = auth.admin;
  const billing = auth.billing as any;
  const session = auth.session;
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id") as string;

  const record = await db.pendingTag.findUnique({ where: { id } });
  if (!record || record.shop !== session.shop) {
    throw new Response("Not found", { status: 404 });
  }

  if (intent === "approve") {
    const response = await admin.graphql(
      `#graphql
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            tags
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: {
            id: record.productId,
            tags: record.suggestedTags,
          },
        },
      },
    );
    const result = await response.json();

    if (result.data?.productUpdate?.userErrors?.length > 0) {
      return Response.json(
        {
          ok: false,
          error: result.data.productUpdate.userErrors
            .map((e: any) => e.message)
            .join(", "),
        },
        { status: 422 },
      );
    }

    await billing.createUsageRecord({
      description: `AI tagging for product: ${record.productTitle}`,
      price: { amount: 0.1, currencyCode: "USD" },
      isTest: true,
    });

    await db.pendingTag.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    return Response.json({ ok: true, action: "approved" });
  }

  if (intent === "reject") {
    await db.pendingTag.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    return Response.json({ ok: true, action: "rejected" });
  }

  return Response.json({ ok: false, error: "Invalid intent" }, { status: 400 });
};

export default function ApprovalPanel() {
  const { pendingTags } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const isLoading = (id: string, intent: string) =>
    fetcher.state !== "idle" &&
    fetcher.formData?.get("id") === id &&
    fetcher.formData?.get("intent") === intent;

  const rows = pendingTags.map((tag: any) => [
    <Thumbnail
      key={`img-${tag.id}`}
      source={tag.imageUrl || ""}
      alt={tag.productTitle}
      size="small"
    />,
    <Text key={`title-${tag.id}`} as="span" variant="bodyMd" fontWeight="bold">
      {tag.productTitle}
    </Text>,
    <Text key={`tags-${tag.id}`} as="span" variant="bodySm" tone="subdued">
      {tag.suggestedTags}
    </Text>,
    <InlineStack key={`actions-${tag.id}`} gap="200" align="start">
      <Button
        variant="primary"
        tone="success"
        loading={isLoading(tag.id, "approve")}
        onClick={() =>
          fetcher.submit(
            { intent: "approve", id: tag.id },
            { method: "POST" },
          )
        }
      >
        Approve & Charge $0.10
      </Button>
      <Button
        variant="secondary"
        tone="critical"
        loading={isLoading(tag.id, "reject")}
        onClick={() =>
          fetcher.submit(
            { intent: "reject", id: tag.id },
            { method: "POST" },
          )
        }
      >
        Reject
      </Button>
    </InlineStack>,
  ]);

  return (
    <Page title="AI Tag Approval">
      {pendingTags.length === 0 ? (
        <Banner tone="info" title="All caught up!">
          <p>
            No products are pending AI tag approval. When new products are
            created, they will appear here for review.
          </p>
        </Banner>
      ) : (
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            {pendingTags.length} product{pendingTags.length !== 1 ? "s" : ""}{" "}
            awaiting approval
          </Text>
          <Card padding="0">
            <DataTable
              columnContentTypes={["text", "text", "text", "text"]}
              headings={["Image", "Product", "Suggested Tags", "Actions"]}
              rows={rows}
            />
          </Card>
        </BlockStack>
      )}
    </Page>
  );
}
