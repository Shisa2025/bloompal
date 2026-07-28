export type UserRole = "admin" | "employee" | "player";
export type PlayerStatus = "active" | "inactive" | "attention";
export type SessionStatus = "Completed" | "In progress" | "Incomplete";
export type ActivityType =
  | "Pinching Flowers"
  | "Watering Plants"
  | "Picking Fruits"
  | "Catching Butterflies"
  | "Arranging Bouquets";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface PlayerProfile {
  id: string;
  userId: string;
  age: number;
  conditionType: string;
  assignedEmployeeId: string;
  status: PlayerStatus;
  progressPercentage: number;
  joinedAt: string;
  lastSessionAt: string;
  preferredHand: "Left" | "Right" | "Both";
}

export interface EmployeeProfile {
  id: string;
  userId: string;
  title: string;
  department: string;
  assignedPlayerIds: string[];
}

export interface GameSession {
  id: string;
  playerId: string;
  employeeId: string;
  startedAt: string;
  durationMinutes: number;
  activityType: ActivityType;
  accuracyPercentage: number;
  completionStatus: SessionStatus;
}

export interface GameTaskResult {
  id: string;
  sessionId: string;
  taskName: string;
  attempts: number;
  successfulAttempts: number;
  score: number;
  completedAt: string;
}

export interface MotionRecord {
  id: string;
  sessionId: string;
  playerId: string;
  recordedAt: string;
  pinchCount: number;
  handOpenCloseCount: number;
  averageReactionTimeMs: number;
  motionAccuracyPercentage: number;
  leftHandUsagePercentage: number;
  rightHandUsagePercentage: number;
}

export interface EmployeeNote {
  id: string;
  playerId: string;
  employeeId: string;
  content: string;
  category: "Progress" | "Observation" | "Follow-up";
  createdAt: string;
}

export interface PlayerListItem extends PlayerProfile {
  name: string;
  employeeName: string;
  email: string;
}

export interface SessionListItem extends GameSession {
  playerName: string;
}

export interface MotionListItem extends MotionRecord {
  playerName: string;
  activityType: ActivityType;
}
