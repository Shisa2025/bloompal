import Link from "next/link";
import styles from "../../dashboard.module.css";

export default function PlayerNotFound() {
  return (
    <section className={styles.panel}>
      <div className={styles.emptyState}>
        <div>
          <h1>Player not found</h1>
          <p>This mock player record does not exist.</p>
          <Link className={styles.textLink} href="/admin/dashboard/players">Return to players</Link>
        </div>
      </div>
    </section>
  );
}
