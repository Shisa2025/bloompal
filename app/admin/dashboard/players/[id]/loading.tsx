import styles from "../../dashboard.module.css";

export default function LoadingPlayerProfile() {
  return (
    <div className={styles.panel} aria-label="Loading player profile">
      <div className="loading-skeleton" style={{ height: 180 }} />
    </div>
  );
}
