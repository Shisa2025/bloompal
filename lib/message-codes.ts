export const errorCodes = [
  "validationUserid",
  "validationNameMin",
  "validationNameMax",
  "validationOrganizationMin",
  "validationOrganizationMax",
  "validationEmail",
  "validationPasswordMin",
  "validationPasswordMax",
  "validationPasswordLetter",
  "validationPasswordNumber",
  "validationGeneric",
  "invalidLogin",
  "databaseUnavailable",
  "invalidAdminCode",
  "chooseActiveAdmin",
  "adminInactive",
  "duplicateAccount",
  "duplicateEmail",
  "passwordsMismatch",
  "currentPasswordIncorrect",
  "flowerUnavailable",
  "flowerNotOwned",
  "bugNotFound",
  "bugGone",
  "snapshotNotFound",
  "snapshotGone",
  "fishNotFound",
  "fishGone",
  "fruitNotFound",
  "fruitGone",
  "seedUnavailable",
  "saveSeedFailed",
  "invalidMotionResult",
  "completeWateringFailed",
  "bugUnavailable",
  "saveBugFailed",
  "fishUnavailable",
  "saveFishFailed",
  "fruitUnavailable",
  "snapshotInvalid",
  "snapshotTooLarge",
  "saveSnapshotFailed",
  "captureSceneFailed",
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export const noticeCodes = [
  "managedUserCreated",
  "managedUserUpdated",
  "managedPasswordReset",
  "managedUserDisabled",
  "managedUserEnabled",
  "managedUserReleased",
] as const;

export type NoticeCode = (typeof noticeCodes)[number];

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && (errorCodes as readonly string[]).includes(value);
}

export function isNoticeCode(value: unknown): value is NoticeCode {
  return typeof value === "string" && (noticeCodes as readonly string[]).includes(value);
}
