import type {
  EmployeeNote,
  EmployeeProfile,
  GameSession,
  GameTaskResult,
  MotionRecord,
  PlayerListItem,
  SessionListItem,
  User,
} from "./types";

export const users: User[] = [
  { id: "usr-001", name: "Eleanor Wong", email: "eleanor@example.com", role: "player", createdAt: "2026-01-12", lastActiveAt: "2026-06-24T09:15:00+08:00" },
  { id: "usr-002", name: "Harold Lim", email: "harold@example.com", role: "player", createdAt: "2026-02-03", lastActiveAt: "2026-06-23T16:40:00+08:00" },
  { id: "usr-003", name: "Margaret Tan", email: "margaret@example.com", role: "player", createdAt: "2026-02-18", lastActiveAt: "2026-06-24T10:02:00+08:00" },
  { id: "usr-004", name: "Robert Chen", email: "robert@example.com", role: "player", createdAt: "2026-03-01", lastActiveAt: "2026-06-22T14:20:00+08:00" },
  { id: "usr-005", name: "Fatimah Abdullah", email: "fatimah@example.com", role: "player", createdAt: "2026-03-19", lastActiveAt: "2026-06-24T08:48:00+08:00" },
  { id: "usr-006", name: "David Lee", email: "david@example.com", role: "player", createdAt: "2026-04-07", lastActiveAt: "2026-06-21T11:30:00+08:00" },
  { id: "usr-101", name: "Dr. Sarah Ng", email: "sarah@bloompal.local", role: "employee", createdAt: "2025-09-01", lastActiveAt: "2026-06-24T10:30:00+08:00" },
  { id: "usr-102", name: "Marcus Goh", email: "marcus@bloompal.local", role: "employee", createdAt: "2025-10-15", lastActiveAt: "2026-06-24T09:50:00+08:00" },
  { id: "usr-103", name: "Aisha Rahman", email: "aisha@bloompal.local", role: "employee", createdAt: "2025-11-08", lastActiveAt: "2026-06-24T10:10:00+08:00" },
];

export const employeeProfiles: EmployeeProfile[] = [
  { id: "emp-001", userId: "usr-101", title: "Senior Physiotherapist", department: "Rehabilitation", assignedPlayerIds: ["ply-001", "ply-004"] },
  { id: "emp-002", userId: "usr-102", title: "Therapy Assistant", department: "Occupational Therapy", assignedPlayerIds: ["ply-002", "ply-005"] },
  { id: "emp-003", userId: "usr-103", title: "Occupational Therapist", department: "Rehabilitation", assignedPlayerIds: ["ply-003", "ply-006"] },
];

export const players: PlayerListItem[] = [
  { id: "ply-001", userId: "usr-001", name: "Eleanor Wong", email: "eleanor@example.com", age: 74, conditionType: "Post-stroke recovery", assignedEmployeeId: "emp-001", employeeName: "Dr. Sarah Ng", status: "active", progressPercentage: 78, joinedAt: "2026-01-12", lastSessionAt: "2026-06-24T09:15:00+08:00", preferredHand: "Right" },
  { id: "ply-002", userId: "usr-002", name: "Harold Lim", email: "harold@example.com", age: 81, conditionType: "Parkinson's mobility", assignedEmployeeId: "emp-002", employeeName: "Marcus Goh", status: "attention", progressPercentage: 42, joinedAt: "2026-02-03", lastSessionAt: "2026-06-23T16:40:00+08:00", preferredHand: "Right" },
  { id: "ply-003", userId: "usr-003", name: "Margaret Tan", email: "margaret@example.com", age: 69, conditionType: "Hand surgery recovery", assignedEmployeeId: "emp-003", employeeName: "Aisha Rahman", status: "active", progressPercentage: 86, joinedAt: "2026-02-18", lastSessionAt: "2026-06-24T10:02:00+08:00", preferredHand: "Left" },
  { id: "ply-004", userId: "usr-004", name: "Robert Chen", email: "robert@example.com", age: 77, conditionType: "Arthritis management", assignedEmployeeId: "emp-001", employeeName: "Dr. Sarah Ng", status: "inactive", progressPercentage: 55, joinedAt: "2026-03-01", lastSessionAt: "2026-06-22T14:20:00+08:00", preferredHand: "Both" },
  { id: "ply-005", userId: "usr-005", name: "Fatimah Abdullah", email: "fatimah@example.com", age: 72, conditionType: "Post-fracture therapy", assignedEmployeeId: "emp-002", employeeName: "Marcus Goh", status: "active", progressPercentage: 71, joinedAt: "2026-03-19", lastSessionAt: "2026-06-24T08:48:00+08:00", preferredHand: "Right" },
  { id: "ply-006", userId: "usr-006", name: "David Lee", email: "david@example.com", age: 66, conditionType: "Fine motor training", assignedEmployeeId: "emp-003", employeeName: "Aisha Rahman", status: "attention", progressPercentage: 38, joinedAt: "2026-04-07", lastSessionAt: "2026-06-21T11:30:00+08:00", preferredHand: "Left" },
];

export const sessions: SessionListItem[] = [
  { id: "SES-2048", playerId: "ply-003", playerName: "Margaret Tan", employeeId: "emp-003", startedAt: "2026-06-24T10:02:00+08:00", durationMinutes: 24, activityType: "Arranging Bouquets", accuracyPercentage: 91, completionStatus: "Completed" },
  { id: "SES-2047", playerId: "ply-001", playerName: "Eleanor Wong", employeeId: "emp-001", startedAt: "2026-06-24T09:15:00+08:00", durationMinutes: 18, activityType: "Pinching Flowers", accuracyPercentage: 84, completionStatus: "Completed" },
  { id: "SES-2046", playerId: "ply-005", playerName: "Fatimah Abdullah", employeeId: "emp-002", startedAt: "2026-06-24T08:48:00+08:00", durationMinutes: 21, activityType: "Watering Plants", accuracyPercentage: 79, completionStatus: "Completed" },
  { id: "SES-2045", playerId: "ply-002", playerName: "Harold Lim", employeeId: "emp-002", startedAt: "2026-06-23T16:40:00+08:00", durationMinutes: 12, activityType: "Catching Butterflies", accuracyPercentage: 58, completionStatus: "Incomplete" },
  { id: "SES-2044", playerId: "ply-001", playerName: "Eleanor Wong", employeeId: "emp-001", startedAt: "2026-06-23T10:10:00+08:00", durationMinutes: 20, activityType: "Picking Fruits", accuracyPercentage: 81, completionStatus: "Completed" },
  { id: "SES-2043", playerId: "ply-004", playerName: "Robert Chen", employeeId: "emp-001", startedAt: "2026-06-22T14:20:00+08:00", durationMinutes: 16, activityType: "Watering Plants", accuracyPercentage: 72, completionStatus: "Completed" },
  { id: "SES-2042", playerId: "ply-006", playerName: "David Lee", employeeId: "emp-003", startedAt: "2026-06-21T11:30:00+08:00", durationMinutes: 14, activityType: "Pinching Flowers", accuracyPercentage: 54, completionStatus: "Incomplete" },
  { id: "SES-2041", playerId: "ply-003", playerName: "Margaret Tan", employeeId: "emp-003", startedAt: "2026-06-20T09:40:00+08:00", durationMinutes: 26, activityType: "Picking Fruits", accuracyPercentage: 89, completionStatus: "Completed" },
];

export const gameSessions: GameSession[] = sessions.map((session) => ({
  id: session.id,
  playerId: session.playerId,
  employeeId: session.employeeId,
  startedAt: session.startedAt,
  durationMinutes: session.durationMinutes,
  activityType: session.activityType,
  accuracyPercentage: session.accuracyPercentage,
  completionStatus: session.completionStatus,
}));

export const motionRecords: (MotionRecord & { playerName: string; activityType: SessionListItem["activityType"] })[] = sessions.slice(0, 7).map((session, index) => ({
  id: `MOT-${3108 - index}`,
  sessionId: session.id,
  playerId: session.playerId,
  playerName: session.playerName,
  activityType: session.activityType,
  recordedAt: session.startedAt,
  pinchCount: [42, 36, 18, 24, 31, 15, 27][index],
  handOpenCloseCount: [28, 22, 34, 19, 26, 31, 20][index],
  averageReactionTimeMs: [820, 1040, 960, 1420, 1110, 1250, 1510][index],
  motionAccuracyPercentage: [92, 85, 81, 61, 83, 74, 56][index],
  leftHandUsagePercentage: [74, 28, 35, 46, 31, 49, 82][index],
  rightHandUsagePercentage: [26, 72, 65, 54, 69, 51, 18][index],
}));

export const taskResults: GameTaskResult[] = [
  { id: "task-001", sessionId: "SES-2048", taskName: "Select matching stems", attempts: 12, successfulAttempts: 11, score: 92, completedAt: "2026-06-24T10:26:00+08:00" },
  { id: "task-002", sessionId: "SES-2047", taskName: "Pinch and release flowers", attempts: 40, successfulAttempts: 34, score: 85, completedAt: "2026-06-24T09:33:00+08:00" },
  { id: "task-003", sessionId: "SES-2046", taskName: "Guide watering can", attempts: 15, successfulAttempts: 12, score: 80, completedAt: "2026-06-24T09:09:00+08:00" },
];

export const employeeNotes: EmployeeNote[] = [
  { id: "note-001", playerId: "ply-001", employeeId: "emp-001", category: "Progress", content: "Pinch control is steadier. Continue short repetitions with a relaxed wrist.", createdAt: "2026-06-24T09:40:00+08:00" },
  { id: "note-002", playerId: "ply-001", employeeId: "emp-001", category: "Observation", content: "Mild fatigue appeared after 15 minutes; accuracy remained consistent.", createdAt: "2026-06-20T11:15:00+08:00" },
  { id: "note-003", playerId: "ply-002", employeeId: "emp-002", category: "Follow-up", content: "Review reaction-time difficulty before the next butterfly activity.", createdAt: "2026-06-23T17:05:00+08:00" },
  { id: "note-004", playerId: "ply-006", employeeId: "emp-003", category: "Observation", content: "Left-hand tracking was intermittent. Recheck lighting and camera position.", createdAt: "2026-06-21T11:55:00+08:00" },
];

export const weeklySessions = [
  { label: "Mon", value: 14 },
  { label: "Tue", value: 18 },
  { label: "Wed", value: 16 },
  { label: "Thu", value: 22 },
  { label: "Fri", value: 25 },
  { label: "Sat", value: 11 },
  { label: "Sun", value: 8 },
];

export const sessionDurationTrend = [
  { label: "W1", value: 16 },
  { label: "W2", value: 17 },
  { label: "W3", value: 18 },
  { label: "W4", value: 21 },
  { label: "W5", value: 22 },
  { label: "W6", value: 24 },
];

export const improvementTrend = [
  { label: "Jan", value: 52 },
  { label: "Feb", value: 57 },
  { label: "Mar", value: 61 },
  { label: "Apr", value: 66 },
  { label: "May", value: 71 },
  { label: "Jun", value: 76 },
];

export const activityPopularity = [
  { label: "Pinching Flowers", value: 32 },
  { label: "Watering Plants", value: 26 },
  { label: "Picking Fruits", value: 19 },
  { label: "Catching Butterflies", value: 14 },
  { label: "Arranging Bouquets", value: 9 },
];

export const recentActivity = [
  { id: "activity-1", title: "Session completed", detail: "Margaret Tan finished Arranging Bouquets with 91% accuracy.", time: "12 minutes ago", tone: "green" },
  { id: "activity-2", title: "Progress note added", detail: "Dr. Sarah Ng added a note for Eleanor Wong.", time: "34 minutes ago", tone: "blue" },
  { id: "activity-3", title: "Attention flag", detail: "Harold Lim's reaction time moved outside the prototype target.", time: "Yesterday", tone: "amber" },
  { id: "activity-4", title: "Player assigned", detail: "David Lee was assigned to Aisha Rahman.", time: "2 days ago", tone: "purple" },
];

export function getPlayer(id: string) {
  return players.find((player) => player.id === id);
}

export function getPlayerSessions(playerId: string) {
  return sessions.filter((session) => session.playerId === playerId);
}

export function getPlayerMotionRecords(playerId: string) {
  return motionRecords.filter((record) => record.playerId === playerId);
}

export function getEmployeeName(employeeId: string) {
  const employee = employeeProfiles.find((profile) => profile.id === employeeId);
  return users.find((user) => user.id === employee?.userId)?.name ?? "Unassigned";
}
