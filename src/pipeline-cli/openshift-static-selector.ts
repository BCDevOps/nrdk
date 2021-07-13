import {OpenShiftResourceSelector} from './openshift-resource-selector'

export class OpenShiftStaticSelector extends OpenShiftResourceSelector {
  constructor(client: any, names: string|string[]) {
    super(client, 'static', names)
  }
}
