'use strict'

export class CONSTANTS {
  KINDS: any = {
    LIST: 'List',
    BUILD: 'Build',
    BUILD_CONFIG: 'BuildConfig',
    IMAGE_STREAM: 'ImageStream',
    IMAGE_STREAM_TAG: 'ImageStreamTag',
    IMAGE_STREAM_IMAGE: 'ImageStreamImage',
    DEPLOYMENT_CONFIG: 'DeploymentConfig',
  };

  ENV: any = {
    BUILD_HASH: '_BUILD_HASH',
  };

  LABELS: any = {
    TEMPLATE_HASH: 'template-hash',
    SOURCE_HASH: 'source-hash',
  };

  ANNOTATIONS: any = {
    TEMPLATE_HASH: 'template-hash',
    SOURCE_HASH: 'source-hash',
  };

  POD_PHASES: any = {
    PENDING: 'Pending',
    RUNNING: 'Running',
    SUCCEEDED: 'Succeeded',
    FAILED: 'Failed',
    UNKNOWN: 'Unknown',
  }
}
