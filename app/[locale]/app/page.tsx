import { Link } from "@/i18n/navigation";
import styles from "../_foundation/foundation.module.css";

const currentPortal = [
  "Users can sign in and access the current BloomPal dashboard experience, including garden/home, bedroom, courtyard/front-house, pond/shop, wardrobe/outfit, music, and merchant/shop interactions.",
  "Gardening activities can record game activity and session data from hand-tracking gameplay.",
  "The current prototype includes wallet/coin, owned music, owned outfit, equipped outfit, and collectible-selling engagement features.",
  "Users can enter a prototype shared online room where present users can see names, avatars, outfits, and synchronised movement/presence.",
  "Admins can review assigned-user activity through the existing admin dashboard.",
];

const proposedRoles = [
  {
    title: "Patient",
    body: "Would access their own programme, game activity, and personal progress results.",
  },
  {
    title: "Therapist / Clinician",
    body: "Would access assigned patients, configure authorised rehabilitation plans, and review progress.",
  },
  {
    title: "Organisation Admin",
    body: "Would manage authorised staff and organisation-level configuration without automatic unrestricted clinical access.",
  },
  {
    title: "BloomPal Admin",
    body: "Would operate and support the platform without automatically receiving clinical authority or unrestricted patient access.",
  },
];

export default function ApplicationSurfacePage() {
  return (
    <main className={styles.surface}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandMark} aria-hidden="true" />
            <span>
              <strong>BloomPal</strong>
              <span>Application surface</span>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="BloomPal surface navigation">
            <Link href="/">Main</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/login">Login</Link>
            <Link href="/admin/dashboard">Admin</Link>
          </nav>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCard}>
            <p className={styles.eyebrow}>App portal concept</p>
            <h1>One product surface, different future experiences.</h1>
            <p className={styles.lead}>
              This route is a lightweight placeholder for the long-term patient, clinician, and organisation
              portal concept. It does not implement new roles, permissions, clinical plans, or database workflows.
            </p>
            <div className={styles.actions}>
              <Link className={styles.button} href="/login">Continue to current login</Link>
              <Link className={styles.secondaryButton} href="/docs">Read architecture notes</Link>
            </div>
          </div>

          <aside className={styles.notice}>
            <strong>Current MVP scope</strong>
            <p>
              BloomPal currently uses a simpler User and Admin model. The role model below is
              documentation for future product direction, not a production RBAC implementation.
            </p>
          </aside>
        </section>

        <section className={styles.statusGrid}>
          <article className={styles.panel}>
            <span className={styles.label}>Current</span>
            <h2>Implemented portal behavior</h2>
            <ul>
              {currentPortal.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className={styles.panel}>
            <span className={`${styles.label} ${styles.warningLabel}`}>Proposed</span>
            <h2>Application direction</h2>
            <p>
              Patients, therapists, and organisation administrators may eventually share the primary
              application surface, with server-side role-based experiences after the backend and product
              requirements are validated.
            </p>
          </article>

          <article className={styles.panel}>
            <span className={`${styles.label} ${styles.futureLabel}`}>Future</span>
            <h2>Institutional readiness</h2>
            <p>
              Real clinical deployment would require decisions around authorization, audit trails, data
              governance, privacy, clinical validation, regulatory pathway, support operations, and institutional onboarding.
            </p>
          </article>
        </section>

        <section className={`${styles.panel} ${styles.mutedSection}`}>
          <span className={styles.label}>Role model</span>
          <h2>Future responsibilities being considered</h2>
          <div className={`${styles.roleGrid} ${styles.mutedSection}`}>
            {proposedRoles.map((role) => (
              <article className={styles.routeCard} key={role.title}>
                <h2>{role.title}</h2>
                <p>{role.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
