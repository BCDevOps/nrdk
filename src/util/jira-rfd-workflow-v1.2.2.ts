/* eslint-disable prettier/prettier */
'use strict'

export const STATUS_OPEN = {id: '1', name: 'Open'}
export const STATUS_IN_PROGRESS = {id: '3', name: 'In Progress'}
export const STATUS_RESOLVED = {id: '5', name: 'Resolved'}
export const STATUS_CLOSED = {id: '6', name: 'Closed'}
const STATUS_SUBMITTED = {id: '10316', name: 'Submitted'}
export const STATUS_APPROVED = {id: '10312', name: 'Approved'}
export const STATUS_SCHEDULED = {id: '10315', name: 'Scheduled'}
const STATUS_WAITING_FOR_INFO = {id: '10317', name: 'Waiting for info'}
const STATUS_IN_REVIEW = {id: '10313', name: 'In  review'}
const STATUS_ON_HOLD = {id: '10314', name: 'On hold'}
const STATUS_REOPENED = {id: '4', name: 'Reopened'}

export const ACTION_921 = {name: 'Cancel', id: '921', to: {...STATUS_CLOSED}}
const ACTION_801 = {name: 'Request  info', id: '801', to: {...STATUS_WAITING_FOR_INFO}}
export const ACTION_961 = {name: 'Re-open', id: '961', to: {...STATUS_REOPENED}}
export const ACTION_4 = {name: 'Start progress', id: '4', to: {...STATUS_IN_PROGRESS}}
export const ACTION_731 = {name: 'Submit', id: '731', to: {...STATUS_SUBMITTED}}
const ACTION_301 = {name: 'Stop Progress', id: '301', to: {...STATUS_WAITING_FOR_INFO}}
export const ACTION_781 = {name: 'Resolve', id: '781', to: {...STATUS_RESOLVED}}
export const ACTION_701 = {name: 'Close issue', id: '701', to: {...STATUS_CLOSED}}
export const ACTION_881 = {name: 'Start review', id: '881', to: {...STATUS_IN_REVIEW}}
export const ACTION_711 = {name: 'Schedule', id: '711', to: {...STATUS_SCHEDULED}}
const ACTION_941 = {name: 'Back to Submitted', id: '941', to: {...STATUS_SUBMITTED}}
const ACTION_751 = {name: 'Info  provided', id: '751', to: {...STATUS_SUBMITTED}}
const ACTION_811 = {name: 'Info provided', id: '811', to: {...STATUS_IN_PROGRESS}}
const ACTION_911 = {name: 'Info   provided', id: '911', to: {...STATUS_IN_REVIEW}}
export const ACTION_721 = {name: 'Approve', id: '721', to: {...STATUS_APPROVED}}
const ACTION_951 = {name: 'Re-close', id: '951', to: {...STATUS_CLOSED}}

const ACTIONS = {
  [ACTION_731.id]: ACTION_731,
  [ACTION_301.id]: ACTION_301,
  [ACTION_781.id]: ACTION_781,
  [ACTION_701.id]: ACTION_701,
  [ACTION_881.id]: ACTION_881,
  [ACTION_711.id]: ACTION_711,
  [ACTION_941.id]: ACTION_941,
  [ACTION_751.id]: ACTION_751,
  [ACTION_811.id]: ACTION_811,
  [ACTION_911.id]: ACTION_911,
  [ACTION_721.id]: ACTION_721,
  [ACTION_951.id]: ACTION_951,
  [ACTION_921.id]: ACTION_921,
  [ACTION_801.id]: ACTION_801,
  [ACTION_961.id]: ACTION_961,
  [ACTION_4.id]: ACTION_4,
}
const WORKFLOW = {
  [STATUS_OPEN.id]: [
    ACTION_731, // Submit
    ACTION_921, // Cancel
  ],
  [STATUS_IN_PROGRESS.id]: [
    ACTION_301, // Stop Progress
    ACTION_781, // Resolve
    ACTION_921, // Cancel
  ],
  [STATUS_RESOLVED.id]: [
    ACTION_701, // Close issue
    ACTION_961, // Re-open
    ACTION_921, // Cancel
  ],
  [STATUS_CLOSED.id]: [
    ACTION_961, // Re-open
    ACTION_921, // Cancel
  ],
  [STATUS_SUBMITTED.id]: [
    ACTION_881, // Start review
    ACTION_801, // Request  info
    ACTION_921, // Cancel
  ],
  [STATUS_APPROVED.id]: [
    ACTION_711, // Schedule
    ACTION_941, // Back to Submitted
    ACTION_801, // Request  info
    ACTION_921, // Cancel
  ],
  [STATUS_SCHEDULED.id]: [
    ACTION_4, // Start progress
    ACTION_801, // Request  info
    ACTION_921, // Cancel
  ],
  [STATUS_WAITING_FOR_INFO.id]: [
    ACTION_751, // Info  provided
    ACTION_811, // Info provided
    ACTION_911, // Info   provided
    ACTION_921, // Cancel
  ],
  [STATUS_IN_REVIEW.id]: [
    ACTION_721, // Approve
    ACTION_801, // Request  info
    ACTION_921, // Cancel
  ],
  [STATUS_ON_HOLD.id]: [
    ACTION_921, // Cancel
  ],
  [STATUS_REOPENED.id]: [
    ACTION_951, // Re-close
    ACTION_921, // Cancel
  ],
}

export default class RfdWorkflow {
    static ACTION_921 = ACTION_921

    static ACTION_801 = ACTION_801

    static ACTION_961 = ACTION_961

    static ACTION_4 = ACTION_4

    static ACTION_731 = ACTION_731

    static ACTION_301 = ACTION_301

    static ACTION_781 = ACTION_781

    static ACTION_701 = ACTION_701

    static ACTION_881 = ACTION_881

    static ACTION_711 = ACTION_711

    static ACTION_941 = ACTION_941

    static ACTION_751 = ACTION_751

    static ACTION_811 = ACTION_811

    static ACTION_911 = ACTION_911

    static ACTION_721 = ACTION_721

    static ACTION_951 = ACTION_951

    static STATUS_OPEN = STATUS_OPEN

    static STATUS_IN_PROGRESS = STATUS_IN_PROGRESS

    static STATUS_RESOLVED = STATUS_RESOLVED

    static STATUS_CLOSED = STATUS_CLOSED

    static STATUS_SUBMITTED = STATUS_SUBMITTED

    static STATUS_APPROVED = STATUS_APPROVED

    static STATUS_SCHEDULED = STATUS_SCHEDULED

    static STATUS_WAITING_FOR_INFO = STATUS_WAITING_FOR_INFO

    static STATUS_IN_REVIEW = STATUS_IN_REVIEW

    static STATUS_ON_HOLD = STATUS_ON_HOLD

    static STATUS_REOPENED = STATUS_REOPENED

    static ALL_STATUS = [
      STATUS_OPEN,
      STATUS_IN_PROGRESS,
      STATUS_RESOLVED,
      STATUS_CLOSED,
      STATUS_SUBMITTED,
      STATUS_APPROVED,
      STATUS_SCHEDULED,
      STATUS_WAITING_FOR_INFO,
      STATUS_IN_REVIEW,
      STATUS_ON_HOLD,
      STATUS_REOPENED,
    ]

    static INITIAL_STATUS = STATUS_OPEN

    static getTransitionsByStatusId(statusId: string) {
      return WORKFLOW[statusId]
    }

    static getTransitionById(transitionId: string) {
      return ACTIONS[transitionId]
    }
}
