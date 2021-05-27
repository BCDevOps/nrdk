export const ISSUE_TYPE_CODE = Object.freeze({RFD: 'RFD', RFD_SUBTASK: 'RFD-subtask'})

export const ISSUE_LINK_TYPE_NAME = Object.freeze({RFC_FRD: 'RFC-RFD'})

export const ENV = Object.freeze({BUILD: 'build', DEV: 'dev', DLVR: 'dlvr', TEST: 'test', PROD: 'prod'})

export const JIRA_TARGET_ENV = Object.freeze({DLVR: 'DLVR', TEST: 'TEST', PROD: 'PROD'})

export const JIRA_ENV_REVIEWER = Object.freeze([
  Object.freeze({ENV: JIRA_TARGET_ENV.DLVR, REVIEWER: 'Developer'}),
  Object.freeze({ENV: JIRA_TARGET_ENV.TEST, REVIEWER: 'IIT'}),
  Object.freeze({ENV: JIRA_TARGET_ENV.PROD, REVIEWER: 'Business'}),
])

export const DB_ACTION = Object.freeze({BACKUP: 'backup', RECOVERY: 'recovery'})

export const VERIFY_STATUS = Object.freeze({READY: 'Ready', NOT_READY: 'Not Ready'})

export const REASON = Object.freeze({
  REASON_CODE_RFD_BLOCKED: 'RFD_BLOCKED',
  REASON_DESC_RFD_BLOCKED: 'RFD(s) are blocked',
  REASON_CODE_RFD_NOT_APPROVED: 'RFD_NOT_APPROVED',
  REASON_DESC_RFD_NOT_APPROVED: 'RFD(s) are not approved',
  REASON_CODE_PREVIOUS_RFD_NOT_CLOSED: 'PREVIOUS_RFD_NOT_CLOSED',
  REASON_DESC_PREVIOUS_RFD_NOT_CLOSED: 'Previous stage RFD(s) are not closed',
  REASON_CODE_RFC_NOT_AUTHORIZED: 'RFC_NOT_AUTHORIZED',
  REASON_DESC_RFC_NOT_AUTHORIZED: 'RFC is not authorized to target environment',
})
