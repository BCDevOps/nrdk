/* eslint-disable prettier/prettier */
'use strict'

export const STATUS_OPEN = {id: '1', name: 'Open'}
export const STATUS_APPROVED = {id: '10312', name: 'Approved'}
export const STATUS_CLOSED = {id: '6', name: 'Closed'}
export const STATUS_UNDER_REVIEW = {id: '10500', name: 'Under Review'}
export const STATUS_IN_PROGRESS = {id: '3', name: 'In Progress'}
export const STATUS_RESOLVED = {id: '5', name: 'Resolved'}
export const STATUS_WAITING_FOR_INFO = {id: '10317', name: 'Waiting for info'}
export const STATUS_REOPENED = {id: '4', name: 'Reopened'}

export const ACTION_151 = {name: 'Cancel', id: '151', to: {...STATUS_CLOSED}}
export const ACTION_CANCEL = ACTION_151
export const ACTION_81 = {name: 'Request Info', id: '81', to: {...STATUS_WAITING_FOR_INFO}}
export const ACTION_REQUEST_INFO = ACTION_81
export const ACTION_131 = {name: 'Re-open', id: '131', to: {...STATUS_REOPENED}}
export const ACTION_RE_OPEN = ACTION_131
export const ACTION_71 = {name: 'Back to Open', id: '71', to: {...STATUS_OPEN}}
export const ACTION_BACK_TO_OPEN = ACTION_71
export const ACTION_61 = {name: 'Revoke', id: '61', to: {...STATUS_UNDER_REVIEW}}
export const ACTION_REVOKE = ACTION_61
export const ACTION_181 = {name: 'Submit', id: '181', to: {...STATUS_UNDER_REVIEW}}
export const ACTION_SUBMIT = ACTION_181
export const ACTION_201 = {name: 'Start Progress', id: '201', to: {...STATUS_IN_PROGRESS}}
export const ACTION_START_PROGRESS = ACTION_201
export const ACTION_191 = {name: 'Approve', id: '191', to: {...STATUS_APPROVED}}
export const ACTION_APPROVE = ACTION_191
export const ACTION_161 = {name: 'Request Info', id: '161', to: {...STATUS_WAITING_FOR_INFO}}
export const ACTION_211 = {name: 'Resolve', id: '211', to: {...STATUS_RESOLVED}}
export const ACTION_RESOLVE = ACTION_211
export const ACTION_231 = {name: 'Back to Approved', id: '231', to: {...STATUS_APPROVED}}
export const ACTION_BACK_TO_APPROVED = ACTION_231
export const ACTION_121 = {name: 'Back to In Progress', id: '121', to: {...STATUS_IN_PROGRESS}}
export const ACTION_BACK_TO_IN_PROGRESS = ACTION_121
export const ACTION_221 = {name: 'Close', id: '221', to: {...STATUS_CLOSED}}
export const ACTION_CLOSE = ACTION_221
export const ACTION_91 = {name: 'Info Provided', id: '91', to: {...STATUS_UNDER_REVIEW}}
export const ACTION_INFO_PROVIDED = ACTION_91
export const ACTION_171 = {name: 'Resume Progress', id: '171', to: {...STATUS_IN_PROGRESS}}
export const ACTION_RESUME_PROGRESS = ACTION_171
export const ACTION_141 = {name: 'Re-close', id: '141', to: {...STATUS_CLOSED}}
export const ACTION_RE_CLOSE = ACTION_141

const ACTIONS = {
  [ACTION_181.id]: ACTION_181,
  [ACTION_201.id]: ACTION_201,
  [ACTION_191.id]: ACTION_191,
  [ACTION_161.id]: ACTION_161,
  [ACTION_211.id]: ACTION_211,
  [ACTION_231.id]: ACTION_231,
  [ACTION_121.id]: ACTION_121,
  [ACTION_221.id]: ACTION_221,
  [ACTION_91.id]: ACTION_91,
  [ACTION_171.id]: ACTION_171,
  [ACTION_141.id]: ACTION_141,
  [ACTION_151.id]: ACTION_151,
  [ACTION_81.id]: ACTION_81,
  [ACTION_131.id]: ACTION_131,
  [ACTION_71.id]: ACTION_71,
  [ACTION_61.id]: ACTION_61,
}
const WORKFLOW = {
  [STATUS_OPEN.id]: [
    ACTION_181, // Submit
    ACTION_151, // Cancel
  ],
  [STATUS_APPROVED.id]: [
    ACTION_201, // Start Progress
    ACTION_61, // Revoke
    ACTION_71, // Back to Open
    ACTION_81, // Request Info
    ACTION_151, // Cancel
  ],
  [STATUS_CLOSED.id]: [
    ACTION_131, // Re-open
    ACTION_151, // Cancel
  ],
  [STATUS_UNDER_REVIEW.id]: [
    ACTION_191, // Approve
    ACTION_71, // Back to Open
    ACTION_81, // Request Info
    ACTION_151, // Cancel
  ],
  [STATUS_IN_PROGRESS.id]: [
    ACTION_161, // Request Info
    ACTION_211, // Resolve
    ACTION_231, // Back to Approved
    ACTION_151, // Cancel
  ],
  [STATUS_RESOLVED.id]: [
    ACTION_121, // Back to In Progress
    ACTION_221, // Close
    ACTION_131, // Re-open
    ACTION_151, // Cancel
  ],
  [STATUS_WAITING_FOR_INFO.id]: [
    ACTION_91, // Info Provided
    ACTION_171, // Resume Progress
    ACTION_71, // Back to Open
    ACTION_151, // Cancel
  ],
  [STATUS_REOPENED.id]: [
    ACTION_141, // Re-close
    ACTION_151, // Cancel
  ],
}

export default class RfdWorkflow {
    static ACTION_151 = ACTION_151

    static ACTION_81 = ACTION_81

    static ACTION_131 = ACTION_131

    static ACTION_71 = ACTION_71

    static ACTION_61 = ACTION_61

    static ACTION_181 = ACTION_181

    static ACTION_201 = ACTION_201

    static ACTION_191 = ACTION_191

    static ACTION_161 = ACTION_161

    static ACTION_211 = ACTION_211

    static ACTION_231 = ACTION_231

    static ACTION_121 = ACTION_121

    static ACTION_221 = ACTION_221

    static ACTION_91 = ACTION_91

    static ACTION_171 = ACTION_171

    static ACTION_141 = ACTION_141

    static STATUS_OPEN = STATUS_OPEN

    static STATUS_APPROVED = STATUS_APPROVED

    static STATUS_CLOSED = STATUS_CLOSED

    static STATUS_UNDER_REVIEW = STATUS_UNDER_REVIEW

    static STATUS_IN_PROGRESS = STATUS_IN_PROGRESS

    static STATUS_RESOLVED = STATUS_RESOLVED

    static STATUS_WAITING_FOR_INFO = STATUS_WAITING_FOR_INFO

    static STATUS_REOPENED = STATUS_REOPENED

    static ALL_STATUS = [
      STATUS_OPEN,
      STATUS_APPROVED,
      STATUS_CLOSED,
      STATUS_UNDER_REVIEW,
      STATUS_IN_PROGRESS,
      STATUS_RESOLVED,
      STATUS_WAITING_FOR_INFO,
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
