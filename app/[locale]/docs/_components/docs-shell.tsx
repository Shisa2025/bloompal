import { Link } from "@/i18n/navigation";
import styles from "../../_foundation/foundation.module.css";
import { docsNavigation, getDocsIndex, type DocsPage } from "../_content/docs-content";
import { DocsArticle } from "./docs-renderer";
import { DocsSearch } from "./docs-search";
import { DocsSidebarNav } from "./docs-sidebar-nav";

export function DocsShell({ currentSlug, page }: { currentSlug: string; page: DocsPage }) {
  return (
    <main className={styles.docsSurface}>
      <header className={styles.docsTopbar}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark} aria-hidden="true" />
          <span>
            <strong>BloomPal</strong>
            <span>Docs</span>
          </span>
        </Link>
        <DocsSearch items={getDocsIndex()} />
        <nav className={styles.nav} aria-label="BloomPal navigation">
          <Link href="/">Main</Link>
          <Link href="/app">App concept</Link>
          <Link href="/admin/dashboard">Admin</Link>
        </nav>
      </header>

      <div className={styles.docsLayout}>
        <DocsSidebarNav currentSlug={currentSlug} navigation={docsNavigation} />

        <DocsArticle page={page} />

        <aside className={styles.docsToc} aria-label="On this page">
          <h2>On this page</h2>
          <nav>
            {page.sections.map((section) => (
              <a href={`#${section.id}`} key={section.id}>
                {section.title}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </main>
  );
}
