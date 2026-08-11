import { notFound } from "next/navigation";
import { DocsShell } from "../_components/docs-shell";
import {
  docsNavigation,
  getDocsNavItem,
  getDocsPage,
  getPlaceholderPage,
} from "../_content/docs-content";

export function generateStaticParams() {
  return docsNavigation
    .flatMap((group) => group.items)
    .filter((item) => item.slug !== "introduction")
    .map((item) => ({ slug: item.slug }));
}

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getDocsNavItem(slug);
  if (!item) notFound();

  const page = getDocsPage(slug) ?? getPlaceholderPage(item);
  return <DocsShell currentSlug={slug} page={page} />;
}
