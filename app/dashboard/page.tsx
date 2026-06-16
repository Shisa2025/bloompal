import DesktopOnly from "../components/DesktopOnly";

const careTasks = [
  {
    plant: "Sunny",
    task: "Watering",
    detail: "Needs 220 ml before noon",
    tone: "water",
  },
  {
    plant: "Momo",
    task: "Rotate pot",
    detail: "Face new leaves toward window",
    tone: "sun",
  },
  {
    plant: "Fernie",
    task: "Mist leaves",
    detail: "Humidity dipped overnight",
    tone: "leaf",
  },
];

const plants = [
  {
    name: "Sunny",
    species: "Monstera deliciosa",
    status: "Ready for water",
    moisture: "38%",
    light: "Bright",
    accent: "rose",
  },
  {
    name: "Momo",
    species: "Pilea peperomioides",
    status: "Growing steady",
    moisture: "64%",
    light: "Soft",
    accent: "gold",
  },
  {
    name: "Fernie",
    species: "Boston fern",
    status: "Likes more mist",
    moisture: "72%",
    light: "Shade",
    accent: "green",
  },
];

const activity = [
  "Sunny was watered yesterday at 9:20 AM.",
  "Momo gained a new leaf this week.",
  "Fernie humidity reminder is active.",
];

export default function DashboardPage() {
  return (
    <DesktopOnly>
      <main className="dashboard-shell font-sans text-[#1d2b22]">
        <aside className="dashboard-sidebar" aria-label="Dashboard navigation">
          <div>
            <p className="dashboard-kicker">BloomPal</p>
            <h1>Plant Care</h1>
          </div>

          <nav className="dashboard-nav" aria-label="Primary">
            <a className="dashboard-nav-item dashboard-nav-item-active" href="#overview">
              <span className="dashboard-nav-icon dashboard-nav-icon-leaf" />
              Overview
            </a>
            <a className="dashboard-nav-item" href="#plants">
              <span className="dashboard-nav-icon dashboard-nav-icon-pot" />
              Plants
            </a>
            <a className="dashboard-nav-item" href="#motion">
              <span className="dashboard-nav-icon dashboard-nav-icon-motion" />
              Motion
            </a>
          </nav>

          <section className="dashboard-pet-note" aria-label="Care companion">
            <div className="dashboard-pet-avatar" aria-hidden="true">
              <span />
            </div>
            <div>
              <strong>Pal is watching the garden.</strong>
              <p>3 care moments are ready today.</p>
            </div>
          </section>
        </aside>

        <section className="dashboard-main" id="overview">
          <header className="dashboard-header">
            <div>
              <p className="dashboard-kicker">Tuesday check-in</p>
              <h2>Good morning, your green corner is calm.</h2>
            </div>
            <a className="dashboard-header-action" href="/login">
              Sign out
            </a>
          </header>

          <section className="dashboard-hero" aria-label="Today summary">
            <div className="dashboard-hero-copy">
              <p className="dashboard-kicker">Today</p>
              <h3>3 plants need small care actions</h3>
              <p>
                Keep watering light, rotate the window plants, and check fern
                humidity before evening.
              </p>
            </div>

            <div className="dashboard-garden-visual" aria-hidden="true">
              <span className="dashboard-sun" />
              <span className="dashboard-plant dashboard-plant-one" />
              <span className="dashboard-plant dashboard-plant-two" />
              <span className="dashboard-plant dashboard-plant-three" />
              <span className="dashboard-ground" />
            </div>
          </section>

          <section className="dashboard-stats" aria-label="Care metrics">
            <div className="dashboard-metric">
              <span>Care score</span>
              <strong>86</strong>
              <p>Healthy routine</p>
            </div>
            <div className="dashboard-metric">
              <span>Water due</span>
              <strong>1</strong>
              <p>Next 4 hours</p>
            </div>
            <div className="dashboard-metric">
              <span>Tracked plants</span>
              <strong>12</strong>
              <p>Across 4 rooms</p>
            </div>
          </section>

          <section className="dashboard-grid">
            <section className="dashboard-panel" aria-labelledby="care-title">
              <div className="dashboard-panel-heading">
                <div>
                  <p className="dashboard-kicker">Care queue</p>
                  <h3 id="care-title">Next actions</h3>
                </div>
                <span>Today</span>
              </div>

              <div className="dashboard-task-list">
                {careTasks.map((task) => (
                  <article className="dashboard-task" key={task.plant}>
                    <span
                      className={`dashboard-task-icon dashboard-task-icon-${task.tone}`}
                      aria-hidden="true"
                    />
                    <div>
                      <h4>
                        {task.task} for {task.plant}
                      </h4>
                      <p>{task.detail}</p>
                    </div>
                    <button type="button">Done</button>
                  </article>
                ))}
              </div>
            </section>

            <section className="dashboard-panel" id="motion" aria-labelledby="motion-title">
              <div className="dashboard-panel-heading">
                <div>
                  <p className="dashboard-kicker">Motion care</p>
                  <h3 id="motion-title">Camera game prep</h3>
                </div>
                <span>MediaPipe ready</span>
              </div>

              <div className="dashboard-motion-preview" aria-hidden="true">
                <span className="motion-head" />
                <span className="motion-body" />
                <span className="motion-arm motion-arm-left" />
                <span className="motion-arm motion-arm-right" />
                <span className="motion-hand motion-hand-left" />
                <span className="motion-hand motion-hand-right" />
              </div>

              <p className="dashboard-motion-copy">
                Use future arm and hand rules for watering gestures, stretching
                checks, and playful plant-care tasks.
              </p>
            </section>
          </section>

          <section className="dashboard-bottom-grid">
            <section className="dashboard-panel" id="plants" aria-labelledby="plants-title">
              <div className="dashboard-panel-heading">
                <div>
                  <p className="dashboard-kicker">Plants</p>
                  <h3 id="plants-title">Room overview</h3>
                </div>
                <span>12 total</span>
              </div>

              <div className="dashboard-plant-list">
                {plants.map((plant) => (
                  <article className="dashboard-plant-row" key={plant.name}>
                    <span
                      className={`dashboard-plant-thumb dashboard-plant-thumb-${plant.accent}`}
                      aria-hidden="true"
                    />
                    <div>
                      <h4>{plant.name}</h4>
                      <p>{plant.species}</p>
                    </div>
                    <span>{plant.status}</span>
                    <strong>{plant.moisture}</strong>
                    <em>{plant.light}</em>
                  </article>
                ))}
              </div>
            </section>

            <section className="dashboard-panel" aria-labelledby="activity-title">
              <div className="dashboard-panel-heading">
                <div>
                  <p className="dashboard-kicker">Activity</p>
                  <h3 id="activity-title">Recent notes</h3>
                </div>
              </div>

              <ul className="dashboard-activity-list">
                {activity.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </section>
        </section>
      </main>
    </DesktopOnly>
  );
}
