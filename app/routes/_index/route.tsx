import type { LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    return { showForm: false, embedded: true };
  }

  return { showForm: Boolean(login), embedded: false };
};

export default function App() {
  const { showForm, embedded } = useLoaderData<typeof loader>();

  if (embedded) {
    return (
      <div className={styles.index}>
        <div className={styles.content}>
          <p>Loading SmartTag AI...</p>
          <script
            dangerouslySetInnerHTML={{
              __html: `window.location.replace('/app' + window.location.search);`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>SmartTag AI</h1>
        <p className={styles.text}>
          AI-powered SEO tag generation for your Shopify products. Scans products, generates optimized tags, and lets you approve before they go live.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li><strong>AI Tag Generation</strong>. 5 SEO-optimized tags from product title + description.</li>
          <li><strong>Approval Queue</strong>. Review and approve AI tags before they go live.</li>
          <li><strong>Usage Billing</strong>. $0.10 per approved tag, first 10 free.</li>
        </ul>
      </div>
    </div>
  );
}
