/* eslint-disable prettier/prettier */
'use strict'

export const STATUS_OPEN = {id: '1', name: 'Open'}
export const STATUS_APPROVED = {id: '10312', name: 'Approved'}
export const STATUS_UNDER_REVIEW = {id: '10312', name: 'UNDER REVIEW'}
/** Resolved */
const STATUS_RESOLVED = {id: '5', name: 'Resolved'}
const STATUS_CLOSED = {id: '6', name: 'Closed'}

const ACTION_11 = {name: 'Cancel', id: '11', to: {...STATUS_CLOSED}}
/** Submit */
export const ACTION_21 = {name: 'Submit', id: '21', to: {...STATUS_UNDER_REVIEW}}
/** Approve */
export const ACTION_31 = {name: 'Approve', id: '31', to: {...STATUS_APPROVED}}
/** Reject */
const ACTION_41 = {name: 'Reject', id: '41', to: {...STATUS_OPEN}}
/** Mark Successful */
export const ACTION_71 = {name: 'All Deployments Done', id: '71', to: {...STATUS_RESOLVED}}
const ACTION_91 = {name: 'Mark Failure', id: '91', to: {...STATUS_UNDER_REVIEW}}
const ACTION_101 = {name: 'Re-review', id: '101', to: {...STATUS_OPEN}}
/** Complete */
export const ACTION_81 = {name: 'Complete', id: '81', to: {...STATUS_CLOSED}}

const ACTIONS = {
  [ACTION_21.id]: ACTION_21,
  [ACTION_31.id]: ACTION_31,
  [ACTION_41.id]: ACTION_41,
  [ACTION_71.id]: ACTION_71,
  [ACTION_91.id]: ACTION_91,
  [ACTION_101.id]: ACTION_101,
  [ACTION_81.id]: ACTION_81,
  [ACTION_11.id]: ACTION_11,
}
const WORKFLOW = {
  [STATUS_OPEN.id]: [
    ACTION_21, // Submit
    ACTION_11, // Cancel
  ],
  [STATUS_UNDER_REVIEW.id]: [
    ACTION_31, // Approve
  ],
  [STATUS_APPROVED.id]: [
    ACTION_71, // Mark Successful
    ACTION_91, // Mark Failure
    ACTION_101, // Re-review
    ACTION_11, // Cancel
  ],
  [STATUS_RESOLVED.id]: [
    ACTION_81, // Complete
    ACTION_11, // Cancel
  ],
  [STATUS_CLOSED.id]: [
    ACTION_11, // Cancel
  ],
}

export default class RfcWorkflow {
    static ACTION_11 = ACTION_11

    static ACTION_21 = ACTION_21

    static ACTION_31 = ACTION_31

    static ACTION_41 = ACTION_41

    static ACTION_71 = ACTION_71

    static ACTION_91 = ACTION_91

    static ACTION_101 = ACTION_101

    static ACTION_81 = ACTION_81

    static STATUS_OPEN = STATUS_OPEN

    static STATUS_APPROVED = STATUS_APPROVED

    static STATUS_RESOLVED = STATUS_RESOLVED

    static STATUS_CLOSED = STATUS_CLOSED

    static ALL_STATUS = [
      STATUS_OPEN,
      STATUS_UNDER_REVIEW,
      STATUS_APPROVED,
      STATUS_RESOLVED,
      STATUS_CLOSED,
    ]

    static INITIAL_STATUS = STATUS_OPEN

    static getTransitionsByStatusId(statusId: string) {
      return WORKFLOW[statusId]
    }

    static getTransitionById(transitionId: string) {
      return ACTIONS[transitionId]
    }
}
