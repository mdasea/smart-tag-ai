import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Thumbnail,
  Divider,
  Icon,
} from "@shopify/polaris";
import { CheckIcon, XIcon, ImageIcon } from "@shopify/polaris-icons";
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

  const history = await db.pendingTag.findMany({
    where: {
      shop: session.shop,
      status: { in: ["APPROVED", "REJECTED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { history };
};

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") {
    return (
      <InlineStack gap="100" blockAlign="center">
        <Icon source={CheckIcon} tone="success" />
        <Badge tone="success" size="small">
          Approved
        </Badge>
      </InlineStack>
    );
  }
  return (
    <InlineStack gap="100" blockAlign="center">
      <Icon source={XIcon} tone="critical" />
      <Badge tone="critical" size="small">
        Rejected
      </Badge>
    </InlineStack>
  );
}

function TagChips({ tags }: { tags: string }) {
  const tagList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
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

function TimeAgo({ date }: { date: string }) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let label: string;
  if (diffMins < 1) label = "Just now";
  else if (diffMins < 60) label = `${diffMins}m ago`;
  else if (diffHours < 24) label = `${diffHours}h ago`;
  else if (diffDays < 7) label = `${diffDays}d ago`;
  else label = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Text as="span" variant="bodySm" tone="subdued">
      {label}
    </Text>
  );
}

export default function HistoryPage() {
  const { history } = useLoaderData<typeof loader>();

  const approvedCount = history.filter((h) => h.status === "APPROVED").length;
  const rejectedCount = history.filter((h) => h.status === "REJECTED").length;

  return (
    <Page
      title="History"
      subtitle={`${approvedCount} approved · ${rejectedCount} rejected`}
    >
      <BlockStack gap="600">
        {history.length === 0 ? (
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
                <Icon source={CheckIcon} tone="subdued" />
              </div>
              <BlockStack gap="200" align="center">
                <Text as="h2" variant="headingLg">
                  No activity yet
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                  Once you approve or reject AI-suggested tags, they will appear
                  here. Head to the Approvals tab to get started.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        ) : (
          <BlockStack gap="300">
            {history.map((item: any) => (
              <Card key={item.id} padding="400">
                <BlockStack gap="300">
                  {/* Header row: product + status + time */}
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      {item.imageUrl ? (
                        <Thumbnail
                          source={item.imageUrl}
                          alt={item.productTitle}
                          size="small"
                        />
                      ) : (
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 6,
                            background: "#f6f6f6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon source={ImageIcon} tone="subdued" />
                        </div>
                      )}
                      <Text
                        as="span"
                        variant="bodyMd"
                        fontWeight="semibold"
                      >
                        {item.productTitle}
                      </Text>
                    </InlineStack>
                    <InlineStack gap="300" blockAlign="center">
                      <StatusBadge status={item.status} />
                      <TimeAgo date={item.createdAt} />
                    </InlineStack>
                  </InlineStack>

                  <Divider />

                  {/* Tags */}
                  <BlockStack gap="150">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Tags
                    </Text>
                    <TagChips tags={item.suggestedTags} />
                  </BlockStack>
                </BlockStack>
              </Card>
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </Page>
  );
}
