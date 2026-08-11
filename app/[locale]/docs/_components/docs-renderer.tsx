import styles from "../../_foundation/foundation.module.css";
import type { DocsBlock, DocsPage, Maturity } from "../_content/docs-content";

const statusClass: Record<Maturity, string> = {
  CURRENT: styles.label,
  PROPOSED: `${styles.label} ${styles.warningLabel}`,
  FUTURE: `${styles.label} ${styles.futureLabel}`,
  "OPEN QUESTION": `${styles.label} ${styles.openQuestionLabel}`,
};

export function StatusBadge({ status }: { status: Maturity }) {
  return <span className={statusClass[status]}>{status}</span>;
}

export function DocsArticle({ page }: { page: DocsPage }) {
  return (
    <article className={styles.docsArticle}>
      <header className={styles.docsArticleHeader}>
        <StatusBadge status={page.status} />
        <p className={styles.eyebrow}>{page.eyebrow}</p>
        <h1>{page.title}</h1>
        <p>{page.description}</p>
      </header>

      {page.sections.map((section) => (
        <section className={styles.docsSection} id={section.id} key={section.id}>
          <h2>{section.title}</h2>
          {section.blocks.map((block, index) => (
            <DocsBlockRenderer block={block} key={`${section.id}-${index}`} />
          ))}
        </section>
      ))}
    </article>
  );
}

function DocsBlockRenderer({ block }: { block: DocsBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p>{block.text}</p>;

    case "bullets":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );

    case "callout":
      return (
        <aside className={styles.docsCallout}>
          <StatusBadge status={block.status} />
          <h3>{block.title}</h3>
          {block.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </aside>
      );

    case "cards":
      return (
        <div className={styles.docsCardGrid}>
          {block.items.map((item) => (
            <article className={styles.docsInfoCard} key={item.title}>
              {item.status ? <StatusBadge status={item.status} /> : null}
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      );

    case "comparison":
      return (
        <div className={styles.docsComparison}>
          {block.columns.map((column) => (
            <article key={column.title}>
              <StatusBadge status={column.status} />
              <h3>{column.title}</h3>
              <ul>
                {column.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      );

    case "steps":
      return (
        <ol>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );

    case "code":
      return (
        <pre className={styles.docsCode}>
          <code>{block.value}</code>
        </pre>
      );

    case "table":
      return (
        <div className={styles.docsTableWrap}>
          <table className={styles.docsTable}>
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("-")}>
                  {row.map((cell) => (
                    <td key={cell}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
