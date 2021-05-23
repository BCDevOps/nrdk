'use strict'

import {OpenShiftResourceSelector} from './OpenShiftResourceSelector'

export class OpenShiftStaticSelector extends OpenShiftResourceSelector {
  constructor(client: any, names: string|string[]) {
    super(client, 'static', names)
  }
}
