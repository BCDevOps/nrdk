/* eslint-disable prettier/prettier */
'use strict'

export const STATUS_OPEN = {id: '1', name: 'Open'}
export const STATUS_IN_PROGRESS = {id: '3', name: 'In Progress'}
export const STATUS_CLOSED = {id: '6', name: 'Closed'}
export const STATUS_WAITING_FOR_INFO = {id: '10317', name: 'Waiting for info'}
export const STATUS_REOPENED = {id: '4', name: 'Reopened'}
export const STATUS_UNDER_REVIEW = {id: '10500', name: 'Under Review'}
export const STATUS_APPROVED = {id: '10312', name: 'Approved'}
export const STATUS_RESOLVED = {id: '5', name: 'Resolved'}
export const STATUS_PAUSED = {id: '11202', name: 'Paused'}

export const ACTION_921 = {name: 'Cancel', id: '921', to: {...STATUS_CLOSED}}
export const ACTION_CANCEL = ACTION_921
export const ACTION_801 = {name: 'Request  info', id: '801', to: {...STATUS_WAITING_FOR_INFO}}
export const ACTION_REQUEST_INFO = ACTION_801
export const ACTION_961 = {name: 'Re-open', id: '961', to: {...STATUS_REOPENED}}
export const ACTION_RE_OPEN = ACTION_961
export const ACTION_1011 = {name: 'Revoke', id: '1011', to: {...STATUS_UNDER_REVIEW}}
export const ACTION_REVOKE = ACTION_1011
export const ACTION_201 = {name: 'Start progress', id: '201', to: {...STATUS_IN_PROGRESS}}
export const ACTION_START_PROGRESS = ACTION_201
export const ACTION_1021 = {name: 'Back to Open', id: '1021', to: {...STATUS_OPEN}}
export const ACTION_BACK_TO_OPEN = ACTION_1021
export const ACTION_11 = {name: 'Submit', id: '11', to: {...STATUS_UNDER_REVIEW}}
export const ACTION_SUBMIT = ACTION_11
export const ACTION_301 = {name: 'Stop Progress', id: '301', to: {...STATUS_PAUSED}}
export const ACTION_STOP_PROGRESS = ACTION_301
export const ACTION_971 = {name: 'Resolve', id: '971', to: {...STATUS_RESOLVED}}
export const ACTION_RESOLVE = ACTION_971
export const ACTION_911 = {name: 'Info   provided', id: '911', to: {...STATUS_UNDER_REVIEW}}
export const ACTION_INFO_PROVIDED = ACTION_911
export const ACTION_951 = {name: 'Re-close', id: '951', to: {...STATUS_CLOSED}}
export const ACTION_RE_CLOSE = ACTION_951
export const ACTION_191 = {name: 'Approve', id: '191', to: {...STATUS_APPROVED}}
export const ACTION_APPROVE = ACTION_191
export const ACTION_701 = {name: 'Close issue', id: '701', to: {...STATUS_CLOSED}}
export const ACTION_CLOSE_ISSUE = ACTION_701
export const ACTION_1031 = {name: 'Back to In Progress', id: '1031', to: {...STATUS_IN_PROGRESS}}
export const ACTION_BACK_TO_IN_PROGRESS = ACTION_1031
export const ACTION_1001 = {name: 'Resume Progress', id: '1001', to: {...STATUS_IN_PROGRESS}}
export const ACTION_RESUME_PROGRESS = ACTION_1001

const ACTIONS = {
  [ACTION_11.id]: ACTION_11,
  [ACTION_301.id]: ACTION_301,
  [ACTION_971.id]: ACTION_971,
  [ACTION_911.id]: ACTION_911,
  [ACTION_951.id]: ACTION_951,
  [ACTION_191.id]: ACTION_191,
  [ACTION_701.id]: ACTION_701,
  [ACTION_1031.id]: ACTION_1031,
  [ACTION_1001.id]: ACTION_1001,
  [ACTION_921.id]: ACTION_921,
  [ACTION_801.id]: ACTION_801,
  [ACTION_961.id]: ACTION_961,
  [ACTION_1011.id]: ACTION_1011,
  [ACTION_201.id]: ACTION_201,
  [ACTION_1021.id]: ACTION_1021,
}
const WORKFLOW = {
  [STATUS_OPEN.id]: [
    ACTION_11, // Submit
    ACTION_921, // Cancel
  ],
  [STATUS_IN_PROGRESS.id]: [
    ACTION_301, // Stop Progress
    ACTION_971, // Resolve
    ACTION_1011, // Revoke
    ACTION_921, // Cancel
  ],
  [STATUS_CLOSED.id]: [
    ACTION_961, // Re-open
    ACTION_921, // Cancel
  ],
  [STATUS_WAITING_FOR_INFO.id]: [
    ACTION_911, // Info   provided
    ACTION_1021, // Back to Open
    ACTION_921, // Cancel
  ],
  [STATUS_REOPENED.id]: [
    ACTION_951, // Re-close
    ACTION_921, // Cancel
  ],
  [STATUS_UNDER_REVIEW.id]: [
    ACTION_191, // Approve
    ACTION_801, // Request  info
    ACTION_1021, // Back to Open
    ACTION_921, // Cancel
  ],
  [STATUS_APPROVED.id]: [
    ACTION_201, // Start progress
    ACTION_801, // Request  info
    ACTION_1011, // Revoke
    ACTION_1021, // Back to Open
    ACTION_921, // Cancel
  ],
  [STATUS_RESOLVED.id]: [
    ACTION_701, // Close issue
    ACTION_1031, // Back to In Progress
    ACTION_961, // Re-open
    ACTION_921, // Cancel
  ],
  [STATUS_PAUSED.id]: [
    ACTION_1001, // Resume Progress
    ACTION_921, // Cancel
  ],
}

export default class RfdWorkflow {
    static ACTION_921 = ACTION_921

    static ACTION_801 = ACTION_801

    static ACTION_961 = ACTION_961

    static ACTION_1011 = ACTION_1011

    static ACTION_201 = ACTION_201

    static ACTION_1021 = ACTION_1021

    static ACTION_11 = ACTION_11

    static ACTION_301 = ACTION_301

    static ACTION_971 = ACTION_971

    static ACTION_911 = ACTION_911

    static ACTION_951 = ACTION_951

    static ACTION_191 = ACTION_191

    static ACTION_701 = ACTION_701

    static ACTION_1031 = ACTION_1031

    static ACTION_1001 = ACTION_1001

    static STATUS_OPEN = STATUS_OPEN

    static STATUS_IN_PROGRESS = STATUS_IN_PROGRESS

    static STATUS_CLOSED = STATUS_CLOSED

    static STATUS_WAITING_FOR_INFO = STATUS_WAITING_FOR_INFO

    static STATUS_REOPENED = STATUS_REOPENED

    static STATUS_UNDER_REVIEW = STATUS_UNDER_REVIEW

    static STATUS_APPROVED = STATUS_APPROVED

    static STATUS_RESOLVED = STATUS_RESOLVED

    static STATUS_PAUSED = STATUS_PAUSED

    static ALL_STATUS = [
      STATUS_OPEN,
      STATUS_IN_PROGRESS,
      STATUS_CLOSED,
      STATUS_WAITING_FOR_INFO,
      STATUS_REOPENED,
      STATUS_UNDER_REVIEW,
      STATUS_APPROVED,
      STATUS_RESOLVED,
      STATUS_PAUSED,
    ]

    static INITIAL_STATUS = STATUS_OPEN

    static getTransitionsByStatusId(statusId: string) {
      return WORKFLOW[statusId]
    }

    static getTransitionById(transitionId: string) {
      return ACTIONS[transitionId]
    }
}
