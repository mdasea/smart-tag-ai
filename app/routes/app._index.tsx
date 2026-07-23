import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import {
  Page,
  Card,
  Button,
  Thumbnail,
  Banner,
  InlineStack,
  BlockStack,
  Text,
  Badge,
  ProgressBar,
  Divider,
  Icon,
} from "@shopify/polaris";
import {
  CheckIcon,
  XIcon,
  MagicIcon,
  ImageIcon,
} from "@shopify/polaris-icons";
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

  const approvedToday = await db.pendingTag.count({
    where: {
      shop: session.shop,
      status: "APPROVED",
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  const totalApproved = await db.pendingTag.count({
    where: { shop: session.shop, status: "APPROVED" },
  });

  return { pendingTags, approvedToday, totalApproved };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const auth = await authenticate.admin(request);
  const admin = auth.admin;
  const billing = auth.billing as any;
  const session = auth.session;
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id") as string;

  if (intent === "approve_all") {
    const allPending = await db.pendingTag.findMany({
      where: { shop: session.shop, status: "PENDING" },
    });
    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const record of allPending) {
      const response = await admin.graphql(
        `#graphql
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id tags }
            userErrors { field message }
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
        results.push({
          id: record.id,
          ok: false,
          error: result.data.productUpdate.userErrors
            .map((e: any) => e.message)
            .join(", "),
        });
        continue;
      }

      await billing.createUsageRecord({
        description: `AI tagging for product: ${record.productTitle}`,
        price: { amount: 0.1, currencyCode: "USD" },
        isTest: true,
      });

      await db.pendingTag.update({
        where: { id: record.id },
        data: { status: "APPROVED" },
      });

      results.push({ id: record.id, ok: true });
    }

    return Response.json({ ok: true, action: "approved_all", results });
  }

  const record = await db.pendingTag.findUnique({ where: { id } });
  if (!record || record.shop !== session.shop) {
    throw new Response("Not found", { status: 404 });
  }

  if (intent === "approve") {
    const response = await admin.graphql(
      `#graphql
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product { id tags }
          userErrors { field message }
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

function TagChips({ tags }: { tags: string }) {
  const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
  return (
    <InlineStack gap="200" wrap>
      {tagList.map((tag) => (
        <Badge key={tag} tone="info" size="small">
          {tag}
        </Badge>
      ))}
    </InlineStack>
  );
}

function QualityIndicator({ score }: { score: number | null }) {
  if (score === null) return null;
  const percent = Math.min(100, Math.max(0, score));
  const tone: "success" | "caution" | "critical" =
    percent >= 70 ? "success" : percent >= 40 ? "caution" : "critical";

  return (
    <InlineStack gap="200" align="start" blockAlign="center">
      <div style={{ width: 60 }}>
        <ProgressBar progress={percent} tone={tone} size="small" />
      </div>
      <Text as="span" variant="bodySm" tone="subdued">
        {percent.toFixed(0)}%
      </Text>
    </InlineStack>
  );
}

export default function ApprovalPanel() {
  const { pendingTags, approvedToday, totalApproved } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const isLoading = (id: string, intent: string) =>
    fetcher.state !== "idle" &&
    fetcher.formData?.get("id") === id &&
    fetcher.formData?.get("intent") === intent;

  const isApprovingAll =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "approve_all";

  const stats = [
    { label: "Pending review", value: pendingTags.length },
    { label: "Approved today", value: approvedToday },
    { label: "Total optimized", value: totalApproved },
  ];

  if (pendingTags.length === 0) {
    return (
      <Page title="Tag Approval" subtitle="Review and apply AI-suggested product tags">
        <BlockStack gap="600">
          <Card padding="400">
            <InlineStack gap="800" align="space-around" blockAlign="center">
              {stats.map((stat) => (
                <BlockStack key={stat.label} gap="100" align="center">
                  <Text as="h3" variant="heading2xl" fontWeight="bold">
                    {stat.value}
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    {stat.label}
                  </Text>
                </BlockStack>
              ))}
            </InlineStack>
          </Card>

          <Card padding="600">
            <BlockStack gap="400" align="center">
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "#f1f1f1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon source={CheckIcon} tone="success" />
              </div>
              <BlockStack gap="200" align="center">
                <Text as="h2" variant="headingLg">All caught up</Text>
                <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                  No products are pending AI tag review. When new products are
                  created or the sync workflow runs, suggested tags will appear
                  here for your approval.
                </Text>
              </BlockStack>
              <BlockStack gap="200" align="center">
                <Text as="p" variant="bodySm" tone="subdued">How it works:</Text>
                <InlineStack gap="400">
                  {["AI analyzes product", "Tags appear here", "Approve or reject"].map((step, i) => (
                    <BlockStack key={step} gap="100" align="center">
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          background: "#f1f1f1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text as="span" variant="bodySm" fontWeight="bold">
                          {i + 1}
                        </Text>
                      </div>
                      <Text as="span" variant="bodySm" tone="subdued">{step}</Text>
                    </BlockStack>
                  ))}
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </Page>
    );
  }

  return (
    <Page
      title="Tag Approval"
      subtitle="Review and apply AI-suggested product tags"
      primaryAction={{
        content: `Approve All (${pendingTags.length})`,
        disabled: isApprovingAll,
        loading: isApprovingAll,
        onAction: () =>
          fetcher.submit({ intent: "approve_all" }, { method: "POST" }),
      }}
    >
      <BlockStack gap="600">
        <Card padding="400">
          <InlineStack gap="800" align="space-around" blockAlign="center">
            {stats.map((stat) => (
              <BlockStack key={stat.label} gap="100" align="center">
                <Text as="h3" variant="heading2xl" fontWeight="bold">
                  {stat.value}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  {stat.label}
                </Text>
              </BlockStack>
            ))}
          </InlineStack>
        </Card>

        <BlockStack gap="400">
          {pendingTags.map((tag: any) => (
            <Card key={tag.id} padding="500">
              <BlockStack gap="400">
                <InlineStack gap="400" align="start" blockAlign="center">
                  {tag.imageUrl ? (
                    <Thumbnail source={tag.imageUrl} alt={tag.productTitle} size="medium" />
                  ) : (
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        background: "#f6f6f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon source={ImageIcon} tone="subdued" />
                    </div>
                  )}
                  <BlockStack gap="100">
                    <Text as="h3" variant="headingMd" fontWeight="semibold">
                      {tag.productTitle}
                    </Text>
                    <InlineStack gap="300" align="start" blockAlign="center">
                      <Text as="span" variant="bodySm" tone="subdued">Quality</Text>
                      <QualityIndicator score={tag.tagQualityScore} />
                    </InlineStack>
                  </BlockStack>
                </InlineStack>

                <Divider />

                <BlockStack gap="200">
                  <InlineStack gap="200" align="start" blockAlign="center">
                    <Icon source={MagicIcon} tone="highlight" />
                    <Text as="span" variant="bodySm" fontWeight="semibold">Suggested tags</Text>
                  </InlineStack>
                  <TagChips tags={tag.suggestedTags} />
                </BlockStack>

                <InlineStack gap="200" align="end">
                  <Button
                    variant="secondary"
                    tone="critical"
                    size="medium"
                    loading={isLoading(tag.id, "reject")}
                    disabled={isLoading(tag.id, "approve")}
                    onClick={() => fetcher.submit({ intent: "reject", id: tag.id }, { method: "POST" })}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    tone="success"
                    size="medium"
                    loading={isLoading(tag.id, "approve")}
                    disabled={isLoading(tag.id, "reject")}
                    onClick={() => fetcher.submit({ intent: "approve", id: tag.id }, { method: "POST" })}
                  >
                    Approve & Charge $0.10
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          ))}
        </BlockStack>
      </BlockStack>
    </Page>
  );
}
