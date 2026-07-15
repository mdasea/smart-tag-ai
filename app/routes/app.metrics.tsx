import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { Page, Card, Layout, Text, Banner } from "@shopify/polaris";
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

  const [totalOptimized, pending, rejected, avgResult] = await Promise.all([
    db.pendingTag.count({ where: { shop, status: "APPROVED" } }),
    db.pendingTag.count({ where: { shop, status: "PENDING" } }),
    db.pendingTag.count({ where: { shop, status: "REJECTED" } }),
    db.pendingTag.aggregate({
      where: { shop, status: "APPROVED" },
      _avg: { tagQualityScore: true },
    }),
  ]);

  const avgQualityScore = avgResult._avg.tagQualityScore ?? 0;
  const totalDecisions = totalOptimized + rejected;
  const acceptanceRate =
    totalDecisions > 0
      ? (totalOptimized / totalDecisions) * 100
      : 0;
  const totalRevenue = Math.max(0, (totalOptimized - 10) * 0.1);

  return {
    totalOptimized,
    pending,
    rejected,
    avgQualityScore,
    acceptanceRate,
    totalRevenue,
  };
};

export default function MetricsPage() {
  const {
    totalOptimized,
    pending,
    rejected,
    avgQualityScore,
    acceptanceRate,
    totalRevenue,
  } = useLoaderData<typeof loader>();

  const hasApprovedRecords = totalOptimized > 0;
  const hasDecisions = totalOptimized + rejected > 0;
  const showLowQualityBanner = hasApprovedRecords && avgQualityScore < 60;
  const showLowAcceptanceBanner = hasDecisions && acceptanceRate < 50;
  const showBanners = showLowQualityBanner || showLowAcceptanceBanner;

  return (
    <Page title="Business Metrics">
      <Layout>
        {showBanners && (
          <Layout.Section>
            {showLowQualityBanner && (
              <Banner tone="warning" title="Model may need fine-tuning">
                <p>
                  The average tag quality score is{" "}
                  {avgQualityScore.toFixed(1)}/100, which is below the 60
                  threshold. Consider fine-tuning the model to improve tag
                  relevance.
                </p>
              </Banner>
            )}
            {showLowAcceptanceBanner && (
              <Banner tone="warning" title="Low acceptance rate">
                <p>
                  The current acceptance rate is {acceptanceRate.toFixed(1)}%.
                  This is below the 50% target. Review suggested tags and adjust
                  the model.
                </p>
              </Banner>
            )}
          </Layout.Section>
        )}

        <Layout.Section variant="oneHalf">
          <Card>
            <Text as="h2" variant="headingSm" alignment="center">
              Products Optimized
            </Text>
            <Text
              as="p"
              variant="headingXl"
              fontWeight="bold"
              alignment="center"
            >
              {totalOptimized}
            </Text>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <Text as="h2" variant="headingSm" alignment="center">
              Revenue
            </Text>
            <Text
              as="p"
              variant="headingXl"
              fontWeight="bold"
              alignment="center"
            >
              ${totalRevenue.toFixed(2)}
            </Text>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <Text as="h2" variant="headingSm" alignment="center">
              Acceptance Rate
            </Text>
            <Text
              as="p"
              variant="headingXl"
              fontWeight="bold"
              alignment="center"
            >
              {acceptanceRate.toFixed(1)}%
            </Text>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <Text as="h2" variant="headingSm" alignment="center">
              Avg Tag Quality
            </Text>
            <Text
              as="p"
              variant="headingXl"
              fontWeight="bold"
              alignment="center"
            >
              {avgQualityScore.toFixed(1)}/100
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
