

import {RepositoryReference} from '../service/axios-bitbucket-client'

const CUSTOMFIELD_TARGET_ENV_PROD = 'customfield_10121' // Target environment
const CUSTOMFIELD_RFC_COMPLETE_PROD = 'customfield_12709' // RFC complete, linked and submitted?
const CUSTOMFIELD_SUBTASKS_ADDED_PROD = 'customfield_12711' // All RFD-subtasks added?
const CUSTOMFIELD_RFD_SCHEDULED_PROD = 'customfield_12710' // RFD Scheduled in the calendar?
const CUSTOMFIELD_DEV_TEAM_LEAD_PROD = 'customfield_12529' // Development Team Lead
const CUSTOMFIELD_SUBTASKS_APPROVED_PROD = 'customfield_12712' // RFD-subtasks Approved?
const CUSTOMFIELD_RFC_APPROVED_PROD = 'customfield_12715' // RFC Approved?
const CUSTOMFIELD_STATE_OF_TESTING_PROD = 'customfield_12713' // State of testing?
const CUSTOMFIELD_STAKEHOLDERS_INFORMED_PROD = 'customfield_12714' // Have the stakeholders been informed?
const CUSTOMFIELD_DEPLOYMENT_VERIFIER_PROD = 'customfield_12724' // Who will verify this deployment?
const CUSTOMFIELD_RFD_DEPLOYMENT_STATUS_PROD = 'customfield_12716' // RFD Deployment Status
const CUSTOMFIELD_IRS_UPDATED_PROD = 'customfield_12717' // IRS entry updated?
const CUSTOMFIELD_TRANSITION_SIGNEDOFF_PROD = 'customfield_12718' // Transition Management Signed off?
const CUSTOMFIELD_RFD_SUBTASK_ACKNOWLEDGEMENT_PROD = 'customfield_12532' // RFD-subtask Instructions
const CUSTOMFIELD_DEPLOYMENT_CATEGORY_PROD = 'customfield_12721' // Deployment Category
const CUSTOMFIELD_RFD_ACKNOWLEDGEMENT_PROD = 'customfield_12531' // RFD Instructions
const CUSTOMFIELD_IS_AUTOMATED_PIPELINE_PROD = 'customfield_12202' // Automated Pipeline?

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_TARGET_ENV_TEST = CUSTOMFIELD_TARGET_ENV_PROD // Target environment
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_RFC_COMPLETE_TEST = 'customfield_13126' // RFC complete, linked and submitted?
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_SUBTASKS_ADDED_TEST = 'customfield_13128' // All RFD-subtasks added?
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_RFD_SCHEDULED_TEST = 'customfield_13129' // RFD Scheduled in the calendar?
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_DEV_TEAM_LEAD_TEST = 'customfield_12425' // Development Team Lead
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_SUBTASKS_APPROVED_TEST = 'customfield_13131' // RFD-subtasks Approved?
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_RFC_APPROVED_TEST = 'customfield_13127' // RFC Approved?
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_STATE_OF_TESTING_TEST = 'customfield_13125' // State of testing?
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_STAKEHOLDERS_INFORMED_TEST = 'customfield_13134' // Have the stakeholders been informed?
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_DEPLOYMENT_VERIFIER_TEST = 'customfield_13000' // Who will verify this deployment?
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_RFD_DEPLOYMENT_STATUS_TEST = 'customfield_13106' // RFD Deployment Status
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_IRS_UPDATED_TEST = 'customfield_10615' // IRS entry updated?
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_TRANSITION_SIGNEDOFF_TEST = 'customfield_13105' // Transition Management Signed off?
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_RFD_SUBTASK_ACKNOWLEDGEMENT_TEST = 'customfield_12436' // RFD-subtask Instructions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_DEPLOYMENT_CATEGORY_TEST = 'customfield_12436' // Deployment Category
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_RFD_ACKNOWLEDGEMENT_TEST = 'customfield_12418' // RFD Instructions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CUSTOMFIELD_IS_AUTOMATED_PIPELINE_TEST = CUSTOMFIELD_IS_AUTOMATED_PIPELINE_PROD // Automated Pipeline?

export const CUSTOMFIELD_RFC_COMPLETE = CUSTOMFIELD_RFC_COMPLETE_PROD
export const CUSTOMFIELD_SUBTASKS_ADDED = CUSTOMFIELD_SUBTASKS_ADDED_PROD
export const CUSTOMFIELD_RFD_SCHEDULED = CUSTOMFIELD_RFD_SCHEDULED_PROD
export const CUSTOMFIELD_DEV_TEAM_LEAD = CUSTOMFIELD_DEV_TEAM_LEAD_PROD
export const CUSTOMFIELD_SUBTASKS_APPROVED = CUSTOMFIELD_SUBTASKS_APPROVED_PROD
export const CUSTOMFIELD_RFC_APPROVED = CUSTOMFIELD_RFC_APPROVED_PROD
export const CUSTOMFIELD_STATE_OF_TESTING = CUSTOMFIELD_STATE_OF_TESTING_PROD
export const CUSTOMFIELD_STAKEHOLDERS_INFORMED = CUSTOMFIELD_STAKEHOLDERS_INFORMED_PROD
export const CUSTOMFIELD_DEPLOYMENT_VERIFIER = CUSTOMFIELD_DEPLOYMENT_VERIFIER_PROD
export const CUSTOMFIELD_RFD_DEPLOYMENT_STATUS = CUSTOMFIELD_RFD_DEPLOYMENT_STATUS_PROD
export const CUSTOMFIELD_IRS_UPDATED = CUSTOMFIELD_IRS_UPDATED_PROD
export const CUSTOMFIELD_TRANSITION_SIGNEDOFF = CUSTOMFIELD_TRANSITION_SIGNEDOFF_PROD
export const CUSTOMFIELD_TARGET_ENV = CUSTOMFIELD_TARGET_ENV_PROD
export const CUSTOMFIELD_RFD_SUBTASK_ACKNOWLEDGEMENT = CUSTOMFIELD_RFD_SUBTASK_ACKNOWLEDGEMENT_PROD
export const CUSTOMFIELD_DEPLOYMENT_CATEGORY = CUSTOMFIELD_DEPLOYMENT_CATEGORY_PROD
export const CUSTOMFIELD_RFD_ACKNOWLEDGEMENT = CUSTOMFIELD_RFD_ACKNOWLEDGEMENT_PROD
export const CUSTOMFIELD_IS_AUTOMATED_PIPELINE = CUSTOMFIELD_IS_AUTOMATED_PIPELINE_PROD

export enum IssueTypeNames {
  RFC = 'RFC',
  RFD = 'RFD',
  RFDSubtask = 'RFD-subtask'
}

export interface IssueReferenceByUrl {
  url: string;
}

export interface ReferenceByKey {
  key: string;
}

export interface PullRequestReference {
  url: string;
  number?: string;
  sourceBranch: string;
  targetBranch: string;
  repository: RepositoryReference;
}

export interface NameAndId {
  id?: string;
  name?: string;
}
export interface ValueAndId {
  id?: string;
  value?: string;
}

export type IssueResolution = NameAndId

export type IssueStatus = NameAndId

export type IssueType = NameAndId

export type Version = NameAndId

export interface Issue {
  id?: string;
  key?: string;
  fields?: {
    project?: ReferenceByKey;
    summary?: string;
    description?: string;
    status?: IssueStatus;
    issuetype?: IssueType;
    fixVersions?: Version[];
    /** Target Environment */
    [CUSTOMFIELD_TARGET_ENV]?: ValueAndId;
    labels?: string[];
    issuelinks?: any[];
    [key: string]: any;
  };
}
export type IssueReference = Issue

export interface DeploymentArgument {
  issue: IssueReference;
  pullRequest: PullRequestReference;
  targetEnvironment: string | string[];
  dryrun?: boolean;
}
export type StartDeploymentArgument = DeploymentArgument

export interface StartDeploymentResult {
  issues: Issue[];
  errors?: any[];
}

export type ProjectReference = ReferenceByKey

export interface RfdSubmitTransitionFields {
  [CUSTOMFIELD_RFC_COMPLETE]: any; // RFC complete, linked and submitted?
  [CUSTOMFIELD_SUBTASKS_ADDED]: any; // All RFD-subtasks added?
  [CUSTOMFIELD_RFD_SCHEDULED]: any; // RFD Scheduled in the calendar?
  [CUSTOMFIELD_DEV_TEAM_LEAD]: any; // Development Team Lead
}

export interface RfdApproveTransitionFields {
  [CUSTOMFIELD_SUBTASKS_APPROVED]: any; // RFD-subtasks Approved?
  [CUSTOMFIELD_RFC_APPROVED]: any; // RFC Approved?
  [CUSTOMFIELD_STATE_OF_TESTING]: any; // State of testing?
  [CUSTOMFIELD_STAKEHOLDERS_INFORMED]: any; // Have the stakeholders been informed?
  [CUSTOMFIELD_DEPLOYMENT_VERIFIER]: any; // Who will verify this deployment?
}

export interface RfdCloseTransitionFields {
  [CUSTOMFIELD_RFD_DEPLOYMENT_STATUS]: any; // RFD Deployment Status
  [CUSTOMFIELD_IRS_UPDATED]: any; // IRS entry updated?
  [CUSTOMFIELD_TRANSITION_SIGNEDOFF]: any; // Transition Management Signed off?
}
