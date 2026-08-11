"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useRef } from "react";
import styles from "../../_foundation/foundation.module.css";
import type { DocsNavGroup } from "../_content/docs-content";

const SIDEBAR_SCROLL_KEY = "bloompal-docs-sidebar-scroll-top";

export function DocsSidebarNav({
  currentSlug,
  navigation,
}: {
  currentSlug: string;
  navigation: DocsNavGroup[];
}) {
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const storedScrollTop = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (storedScrollTop) {
      sidebar.scrollTop = Number(storedScrollTop);
    }
  }, [currentSlug]);

  function rememberScrollPosition() {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(sidebar.scrollTop));
  }

  return (
    <aside
      className={styles.docsSidebar}
      aria-label="Documentation navigation"
      onScroll={rememberScrollPosition}
      ref={sidebarRef}
    >
      {navigation.map((group) => (
        <section key={group.title}>
          <h2>{group.title}</h2>
          <ul>
            {group.items.map((item) => {
              const active = item.slug === currentSlug;
              return (
                <li key={item.slug}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={active ? styles.docsNavActive : undefined}
                    href={item.slug === "introduction" ? "/docs" : `/docs/${item.slug}`}
                    onClick={rememberScrollPosition}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </aside>
  );
}
