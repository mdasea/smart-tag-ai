import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import {
  Page,
  Card,
  Layout,
  Text,
  Banner,
  BlockStack,
  InlineStack,
  Box,
  ProgressBar,
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

  const { shop } = session;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeek = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalOptimized,
    pending,
    rejected,
    avgResult,
    thisWeekApproved,
    lastWeekApproved,
    thisWeekRejected,
  ] = await Promise.all([
    db.pendingTag.count({ where: { shop, status: "APPROVED" } }),
    db.pendingTag.count({ where: { shop, status: "PENDING" } }),
    db.pendingTag.count({ where: { shop, status: "REJECTED" } }),
    db.pendingTag.aggregate({
      where: { shop, status: "APPROVED" },
      _avg: { tagQualityScore: true },
    }),
    db.pendingTag.count({
      where: { shop, status: "APPROVED", createdAt: { gte: weekAgo } },
    }),
    db.pendingTag.count({
      where: {
        shop,
        status: "APPROVED",
        createdAt: { gte: prevWeek, lt: weekAgo },
      },
    }),
    db.pendingTag.count({
      where: { shop, status: "REJECTED", createdAt: { gte: weekAgo } },
    }),
  ]);

  const avgQualityScore = avgResult._avg.tagQualityScore ?? 0;
  const totalDecisions = totalOptimized + rejected;
  const acceptanceRate =
    totalDecisions > 0 ? (totalOptimized / totalDecisions) * 100 : 0;
  const totalRevenue = Math.max(0, (totalOptimized - 10) * 0.1);

  // Week-over-week trend for approvals
  const approvalTrend =
    lastWeekApproved > 0
      ? ((thisWeekApproved - lastWeekApproved) / lastWeekApproved) * 100
      : thisWeekApproved > 0
        ? 100
        : 0;

  return {
    totalOptimized,
    pending,
    rejected,
    avgQualityScore,
    acceptanceRate,
    totalRevenue,
    thisWeekApproved,
    approvalTrend,
    thisWeekRejected,
  };
};

function StatCard({
  label,
  value,
  subtitle,
  tone = "subdued",
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: "subdued" | "success" | "critical" | "caution";
}) {
  return (
    <Card padding="500">
      <BlockStack gap="200">
        <Text as="span" variant="bodySm" tone="subdued">
          {label}
        </Text>
        <Text as="h3" variant="heading2xl" fontWeight="bold">
          {value}
        </Text>
        {subtitle && (
          <Text as="span" variant="bodySm" tone={tone}>
            {subtitle}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}

function TrendIndicator({ value }: { value: number }) {
  const isPositive = value >= 0;
  const tone = isPositive ? "success" : "critical";
  const arrow = isPositive ? "↑" : "↓";
  return (
    <Text as="span" variant="bodySm" tone={tone}>
      {arrow} {Math.abs(value).toFixed(0)}% vs last week
    </Text>
  );
}

export default function MetricsPage() {
  const {
    totalOptimized,
    pending,
    rejected,
    avgQualityScore,
    acceptanceRate,
    totalRevenue,
    thisWeekApproved,
    approvalTrend,
    thisWeekRejected,
  } = useLoaderData<typeof loader>();

  const hasApprovedRecords = totalOptimized > 0;
  const hasDecisions = totalOptimized + rejected > 0;
  const showLowQualityBanner = hasApprovedRecords && avgQualityScore < 60;
  const showLowAcceptanceBanner = hasDecisions && acceptanceRate < 50;

  // Tag quality progress color
  const qualityTone: "success" | "caution" | "critical" =
    avgQualityScore >= 70
      ? "success"
      : avgQualityScore >= 40
        ? "caution"
        : "critical";

  return (
    <Page
      title="Metrics"
      subtitle="Performance overview of AI tagging operations"
    >
      <BlockStack gap="600">
        {/* Warning banners */}
        {showLowQualityBanner && (
          <Banner tone="warning" title="Model may need fine-tuning">
            <p>
              Average tag quality is {avgQualityScore.toFixed(1)}/100 — below
              the 60-point threshold. Consider adjusting the AI prompt or
              reviewing your product catalog for better results.
            </p>
          </Banner>
        )}
        {showLowAcceptanceBanner && (
          <Banner tone="warning" title="Low acceptance rate">
            <p>
              Acceptance rate is {acceptanceRate.toFixed(1)}% — below the 50%
              target. The AI suggestions may need refinement to better match
              your product catalog.
            </p>
          </Banner>
        )}

        {/* Primary KPIs — 4-column grid */}
        <Layout>
          <Layout.Section variant="oneFourth">
            <StatCard
              label="Products Optimized"
              value={totalOptimized.toString()}
              subtitle={
                thisWeekApproved > 0
                  ? `${thisWeekApproved} this week`
                  : undefined
              }
            />
          </Layout.Section>
          <Layout.Section variant="oneFourth">
            <StatCard
              label="Pending Review"
              value={pending.toString()}
              tone={pending > 10 ? "caution" : "subdued"}
              subtitle={pending > 10 ? "Backlog building" : "On track"}
            />
          </Layout.Section>
          <Layout.Section variant="oneFourth">
            <StatCard
              label="Acceptance Rate"
              value={`${acceptanceRate.toFixed(1)}%`}
              tone={
                acceptanceRate >= 70
                  ? "success"
                  : acceptanceRate >= 50
                    ? "subdued"
                    : "critical"
              }
              subtitle={
                rejected > 0 ? `${rejected} rejected total` : undefined
              }
            />
          </Layout.Section>
          <Layout.Section variant="oneFourth">
            <StatCard
              label="Revenue"
              value={`$${totalRevenue.toFixed(2)}`}
              tone={totalRevenue > 0 ? "success" : "subdued"}
            />
          </Layout.Section>
        </Layout>

        {/* Secondary metrics + weekly breakdown */}
        <Layout>
          {/* Tag quality card */}
          <Layout.Section variant="oneHalf">
            <Card padding="500">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Tag Quality Score
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Average relevance score across all approved tags. Higher
                    scores mean the AI suggestions better match your products.
                  </Text>
                </BlockStack>
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodySm" tone="subdued">
                      0
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      100
                    </Text>
                  </InlineStack>
                  <ProgressBar
                    progress={Math.min(100, avgQualityScore)}
                    tone={qualityTone}
                    size="medium"
                  />
                </BlockStack>
                <InlineStack gap="200" align="end">
                  <Text as="h3" variant="heading2xl" fontWeight="bold">
                    {avgQualityScore.toFixed(1)}
                  </Text>
                  <Text as="span" variant="bodyMd" tone="subdued">
                    / 100
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Weekly activity card */}
          <Layout.Section variant="oneHalf">
            <Card padding="500">
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    This Week
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Approval and rejection activity for the past 7 days.
                  </Text>
                </BlockStack>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodyMd">
                      Approved
                    </Text>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodyMd" fontWeight="bold">
                        {thisWeekApproved}
                      </Text>
                      {totalOptimized > 0 && (
                        <TrendIndicator value={approvalTrend} />
                      )}
                    </InlineStack>
                  </InlineStack>
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodyMd">
                      Rejected
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold">
                      {thisWeekRejected}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodyMd">
                      Pending
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold">
                      {pending}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
