"use client";

import { Link } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import styles from "../../_foundation/foundation.module.css";

type SearchItem = {
  title: string;
  description: string;
  group: string;
  href: string;
};

export function DocsSearch({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return items
      .filter((item) =>
        `${item.title} ${item.description} ${item.group}`.toLowerCase().includes(normalized),
      )
      .slice(0, 6);
  }, [items, query]);

  return (
    <div className={styles.docsSearch}>
      <label className={styles.searchLabel} htmlFor="docs-search">
        Search documentation
      </label>
      <input
        id="docs-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search documentation..."
      />
      {results.length ? (
        <div className={styles.searchResults}>
          {results.map((item) => (
            <Link href={item.href} key={item.href}>
              <strong>{item.title}</strong>
              <span>{item.group}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
