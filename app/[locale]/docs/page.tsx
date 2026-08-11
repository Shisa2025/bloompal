import { notFound } from "next/navigation";
import { DocsShell } from "./_components/docs-shell";
import { getDocsPage } from "./_content/docs-content";

export default function DocsFoundationPage() {
  const page = getDocsPage("introduction");
  if (!page) notFound();

  return <DocsShell currentSlug="introduction" page={page} />;
}
