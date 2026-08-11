import "server-only";

import { deleteSessionsForUser } from "./auth-sessions";
import { sql } from "./connection";
import { hashPassword, type AccountStatus } from "./users";

export type ActivityType = "watering" | "collect_bugs" | "snapshot" | "catch_fish" | "pluck_fruit";

export type AdminSession = {
  id: string;
  userid: string;
  userName: string;
  activityType: ActivityType;
  startedAt: string;
  completedAt: string;
  durationSeconds: number | null;
  leftRepetitions: number | null;
  rightRepetitions: number | null;
  successfulActions: number | null;
  totalAttempts: number | null;
  resultMetadata: Record<string, unknown>;
};

export type ManagedUser = {
  userid: string;
  email: string;
  displayName: string;
  status: AccountStatus;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  sessionCount: number;
  averageDurationSeconds: number | null;
  flowerCount: number;
  fruitCount: number;
  fishCount: number;
  bugCount: number;
  snapshotCount: number;
};

export type ActivitySummary = {
  activityType: ActivityType;
  value: number;
  averageDurationSeconds: number | null;
};

export type UserActivitySummary = {
  userid: string;
  userName: string;
  value: number;
  lastActivityAt: string | null;
};

export type SuccessRateSummary = {
  activityType: "collect_bugs" | "catch_fish";
  successfulActions: number;
  totalAttempts: number;
  rate: number;
};

type OverviewRow = {
  total_users: string | number;
  active_users: string | number;
  sessions_today: string | number;
  average_duration: string | number | null;
  inactive_users: string | number;
  flower_count: string | number;
  fruit_count: string | number;
  fish_count: string | number;
  bug_count: string | number;
  snapshot_count: string | number;
};

type ManagedUserRow = {
  userid: string;
  useremail: string;
  display_name: string | null;
  account_status: AccountStatus;
  must_change_password: boolean;
  created_at: Date | string;
  last_login_at: Date | string | null;
  last_activity_at: Date | string | null;
  session_count: string | number;
  average_duration: string | number | null;
  flower_count: string | number;
  fruit_count: string | number;
  fish_count: string | number;
  bug_count: string | number;
  snapshot_count: string | number;
};

type SessionRow = {
  id: string;
  userid: string;
  display_name: string | null;
  activity_type: ActivityType;
  started_at: Date | string;
  completed_at: Date | string;
  duration_seconds: number | null;
  left_repetitions: number | null;
  right_repetitions: number | null;
  successful_actions: number | null;
  total_attempts: number | null;
  result_metadata: Record<string, unknown> | null;
};

const sessionSelect = `
  sessions.id, sessions.userid, users.display_name, sessions.activity_type,
  sessions.started_at, sessions.completed_at, sessions.duration_seconds,
  sessions.left_repetitions, sessions.right_repetitions,
  sessions.successful_actions, sessions.total_attempts, sessions.result_metadata
`;

const userAggregateSelect = `
  users.userid, users.useremail, users.display_name, users.account_status,
  users.must_change_password, users.created_at, users.last_login_at,
  MAX(game_sessions.completed_at) AS last_activity_at,
  COUNT(DISTINCT game_sessions.id) AS session_count,
  AVG(game_sessions.duration_seconds) FILTER (WHERE game_sessions.duration_seconds IS NOT NULL) AS average_duration,
  COUNT(DISTINCT user_plants.id) FILTER (WHERE user_plants.status = 'completed') AS flower_count,
  COUNT(DISTINCT user_fruits.id) AS fruit_count,
  COUNT(DISTINCT user_fish.id) AS fish_count,
  COUNT(DISTINCT user_bugs.id) AS bug_count,
  COUNT(DISTINCT user_snapshots.id) AS snapshot_count
`;

const userAggregateJoins = `
  LEFT JOIN game_sessions ON game_sessions.userid = users.userid
  LEFT JOIN user_plants ON user_plants.userid = users.userid
  LEFT JOIN user_fruits ON user_fruits.userid = users.userid
  LEFT JOIN user_fish ON user_fish.userid = users.userid
  LEFT JOIN user_bugs ON user_bugs.userid = users.userid
  LEFT JOIN user_snapshots ON user_snapshots.userid = users.userid
`;

export async function getAdminOverview(adminUserid: string) {
  const rows = await sql.query<OverviewRow>(
    `
    WITH managed_users AS (
      SELECT userid
      FROM users
      WHERE admin_userid = $1 AND role = 'user'
    ),
    user_stats AS (
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM game_sessions recent
            WHERE recent.userid = managed_users.userid
              AND recent.completed_at >= NOW() - INTERVAL '7 days'
          )
        ) AS active_users,
        COUNT(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1 FROM game_sessions recent
            WHERE recent.userid = managed_users.userid
              AND recent.completed_at >= NOW() - INTERVAL '7 days'
          )
        ) AS inactive_users
      FROM managed_users
    ),
    session_stats AS (
      SELECT
        COUNT(*) FILTER (
          WHERE sessions.completed_at >= (
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Singapore')
            AT TIME ZONE 'Asia/Singapore'
          )
        ) AS sessions_today,
        AVG(sessions.duration_seconds) FILTER (
          WHERE sessions.completed_at >= NOW() - INTERVAL '30 days'
        ) AS average_duration
      FROM game_sessions sessions
      JOIN managed_users ON managed_users.userid = sessions.userid
    ),
    asset_stats AS (
      SELECT
        (SELECT COUNT(*) FROM user_plants plants
          JOIN managed_users ON managed_users.userid = plants.userid
          WHERE plants.status = 'completed') AS flower_count,
        (SELECT COUNT(*) FROM user_fruits fruits
          JOIN managed_users ON managed_users.userid = fruits.userid) AS fruit_count,
        (SELECT COUNT(*) FROM user_fish fish
          JOIN managed_users ON managed_users.userid = fish.userid) AS fish_count,
        (SELECT COUNT(*) FROM user_bugs bugs
          JOIN managed_users ON managed_users.userid = bugs.userid) AS bug_count,
        (SELECT COUNT(*) FROM user_snapshots snapshots
          JOIN managed_users ON managed_users.userid = snapshots.userid) AS snapshot_count
    )
    SELECT
      user_stats.total_users,
      user_stats.active_users,
      session_stats.sessions_today,
      session_stats.average_duration,
      user_stats.inactive_users,
      asset_stats.flower_count,
      asset_stats.fruit_count,
      asset_stats.fish_count,
      asset_stats.bug_count,
      asset_stats.snapshot_count
    FROM user_stats CROSS JOIN session_stats CROSS JOIN asset_stats
    `,
    [adminUserid],
  );
  const row = rows[0];
  const [recentSessions, attentionUsers] = await Promise.all([
    listAdminSessions(adminUserid, { pageSize: 5 }),
    listManagedUsers(adminUserid, { inactivity: true, pageSize: 5 }),
  ]);

  return {
    totalUsers: number(row?.total_users),
    activeUsers: number(row?.active_users),
    sessionsToday: number(row?.sessions_today),
    averageDurationSeconds: nullableRoundedNumber(row?.average_duration),
    inactiveUsers: number(row?.inactive_users),
    flowerCount: number(row?.flower_count),
    fruitCount: number(row?.fruit_count),
    fishCount: number(row?.fish_count),
    bugCount: number(row?.bug_count),
    snapshotCount: number(row?.snapshot_count),
    recentSessions: recentSessions.items,
    attentionUsers: attentionUsers.items,
  };
}

export async function listManagedUsers(
  adminUserid: string,
  options: {
    query?: string;
    status?: AccountStatus | "all";
    page?: number;
    pageSize?: number;
    inactivity?: boolean;
  } = {},
) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const values: unknown[] = [adminUserid];
  const conditions = ["users.admin_userid = $1", "users.role = 'user'"];

  if (options.query?.trim()) {
    values.push(`%${options.query.trim()}%`);
    conditions.push(
      `(users.userid ILIKE $${values.length} OR users.display_name ILIKE $${values.length} OR users.useremail ILIKE $${values.length})`,
    );
  }
  if (options.status && options.status !== "all") {
    values.push(options.status);
    conditions.push(`users.account_status = $${values.length}`);
  }
  if (options.inactivity) {
    conditions.push(`NOT EXISTS (
      SELECT 1 FROM game_sessions recent
      WHERE recent.userid = users.userid
        AND recent.completed_at >= NOW() - INTERVAL '7 days'
    )`);
  }

  const where = conditions.join(" AND ");
  const countRows = await sql.query<{ count: string | number }>(
    `SELECT COUNT(*) AS count FROM users WHERE ${where}`,
    values,
  );
  values.push(pageSize, (page - 1) * pageSize);
  const rows = await sql.query<ManagedUserRow>(
    `
    SELECT ${userAggregateSelect}
    FROM users
    ${userAggregateJoins}
    WHERE ${where}
    GROUP BY users.userid
    ORDER BY MAX(game_sessions.completed_at) DESC NULLS LAST, users.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values,
  );

  const total = number(countRows[0]?.count);
  return {
    items: rows.map(toManagedUser),
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getManagedUser(adminUserid: string, userid: string) {
  const rows = await sql.query<ManagedUserRow>(
    `
    SELECT ${userAggregateSelect}
    FROM users
    ${userAggregateJoins}
    WHERE users.admin_userid = $1 AND users.userid = $2 AND users.role = 'user'
    GROUP BY users.userid
    LIMIT 1
    `,
    [adminUserid, userid],
  );

  if (!rows[0]) return null;
  const [sessions, activityRows] = await Promise.all([
    listAdminSessions(adminUserid, { userid, pageSize: 20 }),
    sql.query<{ activity_type: ActivityType; count: string | number; average_duration: string | number | null }>(
      `
      SELECT sessions.activity_type, COUNT(*) AS count, AVG(sessions.duration_seconds) AS average_duration
      FROM game_sessions sessions
      JOIN users ON users.userid = sessions.userid
      WHERE users.admin_userid = $1 AND users.userid = $2 AND users.role = 'user'
      GROUP BY sessions.activity_type
      ORDER BY count DESC, sessions.activity_type ASC
      `,
      [adminUserid, userid],
    ),
  ]);
  return {
    user: toManagedUser(rows[0]),
    sessions: sessions.items,
    activityBreakdown: activityRows.map((row) => ({
      activityType: row.activity_type,
      value: number(row.count),
      averageDurationSeconds: nullableRoundedNumber(row.average_duration),
    })),
  };
}

export async function listAdminSessions(
  adminUserid: string,
  options: {
    query?: string;
    activity?: ActivityType | "all";
    days?: number;
    userid?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(10_000, Math.max(1, options.pageSize ?? 20));
  const values: unknown[] = [adminUserid];
  const conditions = ["users.admin_userid = $1", "users.role = 'user'"];

  if (options.query?.trim()) {
    values.push(`%${options.query.trim()}%`);
    conditions.push(
      `(sessions.id ILIKE $${values.length} OR users.userid ILIKE $${values.length} OR users.display_name ILIKE $${values.length})`,
    );
  }
  if (options.activity && options.activity !== "all") {
    values.push(options.activity);
    conditions.push(`sessions.activity_type = $${values.length}`);
  }
  if (options.days) {
    values.push(Math.min(365, Math.max(1, options.days)));
    conditions.push(`sessions.completed_at >= NOW() - ($${values.length}::text || ' days')::interval`);
  }
  if (options.userid) {
    values.push(options.userid);
    conditions.push(`users.userid = $${values.length}`);
  }

  const where = conditions.join(" AND ");
  const countRows = await sql.query<{ count: string | number }>(
    `
    SELECT COUNT(*) AS count
    FROM game_sessions sessions JOIN users ON users.userid = sessions.userid
    WHERE ${where}
    `,
    values,
  );
  values.push(pageSize, (page - 1) * pageSize);
  const rows = await sql.query<SessionRow>(
    `
    SELECT ${sessionSelect}
    FROM game_sessions sessions JOIN users ON users.userid = sessions.userid
    WHERE ${where}
    ORDER BY sessions.completed_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values,
  );
  const total = number(countRows[0]?.count);

  return {
    items: rows.map(toAdminSession),
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminAnalytics(adminUserid: string, requestedDays: number) {
  const days = [7, 30, 42, 90].includes(requestedDays) ? requestedDays : 42;
  const bucket = days === 7 ? "day" : "week";
  const [trendRows, activityRows, summaryRows, durationRows, userRows, successRows] = await Promise.all([
    sql.query<{ bucket: Date | string; session_count: string | number; average_duration: string | number | null }>(
      `
      SELECT date_trunc('${bucket}', sessions.completed_at AT TIME ZONE 'Asia/Singapore') AS bucket,
        COUNT(*) AS session_count, AVG(sessions.duration_seconds) AS average_duration
      FROM game_sessions sessions JOIN users ON users.userid = sessions.userid
      WHERE users.admin_userid = $1
        AND users.role = 'user'
        AND sessions.completed_at >= NOW() - ($2::text || ' days')::interval
      GROUP BY 1 ORDER BY 1
      `,
      [adminUserid, days],
    ),
    sql.query<{ activity_type: ActivityType; count: string | number }>(
      `
      SELECT sessions.activity_type, COUNT(*) AS count
      FROM game_sessions sessions JOIN users ON users.userid = sessions.userid
      WHERE users.admin_userid = $1
        AND users.role = 'user'
        AND sessions.completed_at >= NOW() - ($2::text || ' days')::interval
      GROUP BY sessions.activity_type ORDER BY count DESC
      `,
      [adminUserid, days],
    ),
    sql.query<{ active_users: string | number; total_sessions: string | number; average_duration: string | number | null }>(
      `
      SELECT COUNT(DISTINCT sessions.userid) AS active_users,
        COUNT(*) AS total_sessions, AVG(sessions.duration_seconds) AS average_duration
      FROM game_sessions sessions JOIN users ON users.userid = sessions.userid
      WHERE users.admin_userid = $1
        AND users.role = 'user'
        AND sessions.completed_at >= NOW() - ($2::text || ' days')::interval
      `,
      [adminUserid, days],
    ),
    sql.query<{ activity_type: ActivityType; count: string | number; average_duration: string | number | null }>(
      `
      SELECT sessions.activity_type, COUNT(*) AS count, AVG(sessions.duration_seconds) AS average_duration
      FROM game_sessions sessions JOIN users ON users.userid = sessions.userid
      WHERE users.admin_userid = $1
        AND users.role = 'user'
        AND sessions.completed_at >= NOW() - ($2::text || ' days')::interval
      GROUP BY sessions.activity_type
      ORDER BY average_duration DESC NULLS LAST, sessions.activity_type ASC
      `,
      [adminUserid, days],
    ),
    sql.query<{ userid: string; display_name: string | null; count: string | number; last_activity_at: Date | string | null }>(
      `
      SELECT users.userid, users.display_name, COUNT(sessions.id) AS count, MAX(sessions.completed_at) AS last_activity_at
      FROM game_sessions sessions JOIN users ON users.userid = sessions.userid
      WHERE users.admin_userid = $1
        AND users.role = 'user'
        AND sessions.completed_at >= NOW() - ($2::text || ' days')::interval
      GROUP BY users.userid, users.display_name
      ORDER BY count DESC, last_activity_at DESC NULLS LAST
      `,
      [adminUserid, days],
    ),
    sql.query<{ activity_type: "collect_bugs" | "catch_fish"; successful_actions: string | number; total_attempts: string | number }>(
      `
      SELECT sessions.activity_type,
        SUM(sessions.successful_actions) AS successful_actions,
        SUM(sessions.total_attempts) AS total_attempts
      FROM game_sessions sessions JOIN users ON users.userid = sessions.userid
      WHERE users.admin_userid = $1
        AND users.role = 'user'
        AND sessions.activity_type IN ('collect_bugs', 'catch_fish')
        AND sessions.successful_actions IS NOT NULL
        AND sessions.total_attempts IS NOT NULL
        AND sessions.total_attempts > 0
        AND sessions.completed_at >= NOW() - ($2::text || ' days')::interval
      GROUP BY sessions.activity_type
      ORDER BY sessions.activity_type ASC
      `,
      [adminUserid, days],
    ),
  ]);

  return {
    days,
    totalSessions: number(summaryRows[0]?.total_sessions),
    activeUsers: number(summaryRows[0]?.active_users),
    averageDurationSeconds: nullableRoundedNumber(summaryRows[0]?.average_duration),
    sessionsTrend: trendRows.map((row) => ({
      bucket: iso(row.bucket),
      value: number(row.session_count),
    })),
    durationTrend: trendRows.map((row) => ({
      bucket: iso(row.bucket),
      value: nullableRoundedNumber(row.average_duration) ?? 0,
    })),
    activityPopularity: activityRows.map((row) => ({
      activityType: row.activity_type,
      value: number(row.count),
    })),
    averageDurationByActivity: durationRows.map((row) => ({
      activityType: row.activity_type,
      value: nullableRoundedNumber(row.average_duration) ?? 0,
      averageDurationSeconds: nullableRoundedNumber(row.average_duration),
    })),
    sessionsByUser: userRows.map((row) => ({
      userid: row.userid,
      userName: row.display_name?.trim() || row.userid,
      value: number(row.count),
      lastActivityAt: row.last_activity_at ? iso(row.last_activity_at) : null,
    })),
    gameSuccessRates: successRows.map((row) => {
      const totalAttempts = number(row.total_attempts);
      const successfulActions = number(row.successful_actions);
      return {
        activityType: row.activity_type,
        successfulActions,
        totalAttempts,
        rate: totalAttempts > 0 ? successfulActions / totalAttempts : 0,
      };
    }),
  };
}

export async function updateManagedUser({
  adminUserid,
  userid,
  displayName,
  email,
}: {
  adminUserid: string;
  userid: string;
  displayName: string;
  email: string;
}) {
  try {
    const rows = await sql.query<{ userid: string }>(
      `
      UPDATE users SET display_name = $3, useremail = $4, updated_at = NOW()
      WHERE admin_userid = $1 AND userid = $2 AND role = 'user'
      RETURNING userid
      `,
      [adminUserid, userid, displayName, email],
    );
    return rows[0] ? "ok" : "not_found";
  } catch (error) {
    if (isUniqueViolation(error)) return "duplicate";
    throw error;
  }
}

export async function setManagedUserStatus(
  adminUserid: string,
  userid: string,
  status: AccountStatus,
) {
  const rows = await sql.query<{ userid: string }>(
    `
    UPDATE users SET account_status = $3, updated_at = NOW()
    WHERE admin_userid = $1 AND userid = $2 AND role = 'user'
    RETURNING userid
    `,
    [adminUserid, userid, status],
  );
  if (rows[0] && status === "disabled") await deleteSessionsForUser(userid);
  return Boolean(rows[0]);
}

export async function resetManagedUserPassword(
  adminUserid: string,
  userid: string,
  password: string,
) {
  const passwordHash = await hashPassword(password);
  const rows = await sql.query<{ userid: string }>(
    `
    UPDATE users
    SET password_hash = $3, must_change_password = TRUE, updated_at = NOW()
    WHERE admin_userid = $1 AND userid = $2 AND role = 'user'
    RETURNING userid
    `,
    [adminUserid, userid, passwordHash],
  );
  if (rows[0]) await deleteSessionsForUser(userid);
  return Boolean(rows[0]);
}

export async function releaseManagedUser(adminUserid: string, userid: string) {
  const rows = await sql.query<{ userid: string }>(
    `
    UPDATE users SET admin_userid = NULL, updated_at = NOW()
    WHERE admin_userid = $1 AND userid = $2 AND role = 'user'
    RETURNING userid
    `,
    [adminUserid, userid],
  );
  return Boolean(rows[0]);
}

function toManagedUser(row: ManagedUserRow): ManagedUser {
  return {
    userid: row.userid,
    email: row.useremail,
    displayName: row.display_name?.trim() || row.userid,
    status: row.account_status,
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: iso(row.created_at),
    lastLoginAt: row.last_login_at ? iso(row.last_login_at) : null,
    lastActivityAt: row.last_activity_at ? iso(row.last_activity_at) : null,
    sessionCount: number(row.session_count),
    averageDurationSeconds: nullableRoundedNumber(row.average_duration),
    flowerCount: number(row.flower_count),
    fruitCount: number(row.fruit_count),
    fishCount: number(row.fish_count),
    bugCount: number(row.bug_count),
    snapshotCount: number(row.snapshot_count),
  };
}

function toAdminSession(row: SessionRow): AdminSession {
  return {
    id: row.id,
    userid: row.userid,
    userName: row.display_name?.trim() || row.userid,
    activityType: row.activity_type,
    startedAt: iso(row.started_at),
    completedAt: iso(row.completed_at),
    durationSeconds: nullableNumber(row.duration_seconds),
    leftRepetitions: nullableNumber(row.left_repetitions),
    rightRepetitions: nullableNumber(row.right_repetitions),
    successfulActions: nullableNumber(row.successful_actions),
    totalAttempts: nullableNumber(row.total_attempts),
    resultMetadata: row.result_metadata ?? {},
  };
}

function iso(value: Date | string) {
  return new Date(value).toISOString();
}

function number(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function nullableNumber(value: string | number | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}

function nullableRoundedNumber(value: string | number | null | undefined) {
  const converted = nullableNumber(value);
  return converted === null ? null : Math.round(converted);
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
