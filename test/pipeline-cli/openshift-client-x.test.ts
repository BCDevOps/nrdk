/* eslint-disable prettier/prettier */

const {EventEmitter} = require('events')
const expect = require('expect')
const sinon = require('sinon')
const fs = require('fs')
const path = require('path')
import {Util} from '../../src/pipeline-cli/util'
import {OpenShiftClientX} from '../../src/pipeline-cli/openshift-client-x'
import {OpenShiftResourceSelector} from '../../src/pipeline-cli/openshift-resource-selector'

const useCase0BuildTemplate = require('./resources/bc.template.json')
const useCase0DeployTemplate = require('./resources/dc.template.json')

const sandbox = sinon.createSandbox()

const PROJECT_TOOLS = 'csnr-devops-lab-tools'
const BASEDIR = path.resolve(__dirname, '..')

const process = (item: any, template: any, parameters: any) => {
  Object.keys(item).forEach(key => {
    let value = item[key]
    if (Util.isString(value)) {
      value = value.replace('', '')
      template.parameters.forEach((param: any) => {
        const regex = new RegExp(`\\$\{${param.name}}`, 'gm')
        value = value.replace(regex, parameters[param.name] || param.value || '')
      })
      // eslint-disable-next-line no-param-reassign
      item[key] = value
    } else if (Util.isArray(value)) {
      value.forEach((subItem: any) => {
        process(subItem, template, parameters)
      })
    } else if (Util.isPlainObject(value)) {
      process(value, template, parameters)
    }
  })
  return item
}

// Process template, params from args and template
function testProcess(filePath: string, args: any) {
  let template = fs.readFileSync(filePath, {encoding: 'utf-8'})
  const templateAsJson = JSON.parse(template)
  const params = Object.assign({}, args.param || {})
  // Pick up additional params from template.parameters
  templateAsJson.parameters.forEach((p: any) => {
    // If param not already present, then add it
    if (!params[p.name] && p.value !== undefined) params[p.name] = p.value
  })

  // Complete template - variable substitution
  Object.keys(params).forEach(prop => {
    const value = params[prop]
    if (value !== null) {
      const regex = new RegExp(`(?<!\\\\)\\$\\{${prop}\\}`, 'gm')
      template = template.replace(regex, value)
    }
  })

  const items = JSON.parse(template).objects
  items.forEach((item: any) => {
    if (item.kind === 'BuildConfig') {
      item.kind = 'buildconfig.build.openshift.io'
    } else if (item.kind === 'ImageStream') {
      item.kind = 'imagestream.image.openshift.io'
    }
  })
  return items
}

// eslint-disable-next-line func-names,space-before-function-paren
describe('OpenShiftClientX', function() {
  this.timeout(999999)
  const options = Util.parseArgumentsFromArray('--git.owner=bcdevops', '--git.repository=pipeline-cli')
  const oc = new OpenShiftClientX(Object.assign({namespace: PROJECT_TOOLS}, options))

  // eslint-disable-next-line func-names,space-before-function-paren,prefer-arrow-callback
  afterEach(function() {
    // completely restore all fakes created through the sandbox
    sandbox.restore()
  })

  // eslint-disable-next-line func-names,space-before-function-paren,prefer-arrow-callback
  it('misc - @fast', async function() {
    const resource = {metadata: {annotations: {test: '123'}}}
    const resource1 = Object.assign({}, resource)

    oc.setAnnotation(resource1, 'test2', '456')
    expect(resource1).toEqual({metadata: {annotations: {test: '123', test2: '456'}}})

    const getAnnotation = oc.getAnnotation(resource1, 'test')
    expect(getAnnotation).toEqual('123')

    const setLabel1 = oc.setLabel({metadata: {annotations: {test: '123'}}}, 'test', '123')
    expect(setLabel1.metadata.labels).toEqual({test: '123'})
  })

  // eslint-disable-next-line func-names,space-before-function-paren,prefer-arrow-callback
  it('startBuild - @fast', async function() {
    const params = {NAME: 'my-test-app'}

    const stubAction = sandbox.stub(oc, '_action')
    const stubExecSync = sandbox.stub(Util, 'execSync')

    // eslint-disable-next-line func-names,space-before-function-paren,prefer-arrow-callback
    stubExecSync.callsFake(function fakeFn(...args: any) {
      throw new Error(`Not Implemented: ${JSON.stringify(args)}`)
    })

    const filePath = `${__dirname}/resources/bc.template.json`
    const processResult = testProcess(filePath, {param: params})

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'process',
      '-f',
      `${__dirname}/resources/bc.template-core.json`,
      '--param=NAME=my-test-app',
      '--output=json',
    ])
    .returns({
      status: 0,
      stdout: JSON.stringify({
        kind: 'List',
        items: [
          {kind: 'ImageStream', metadata: {name: params.NAME}},
          {kind: 'BuildConfig', metadata: {name: params.NAME}},
        ],
      }),
    })

    stubAction.callsFake((...args: any) => {
      throw new Error(`Not Implemented: ${JSON.stringify(args)}`)
    })

    expect(processResult).toBeInstanceOf(Array)
    expect(processResult).toHaveLength(4)
    expect(oc.toNamesList(processResult)).toEqual([
      `imagestream.image.openshift.io/${params.NAME}`,
      `imagestream.image.openshift.io/${params.NAME}-core`,
      `buildconfig.build.openshift.io/${params.NAME}-core`,
      `buildconfig.build.openshift.io/${params.NAME}`,
    ])

    oc.applyBestPractices(oc.wrapOpenShiftList(processResult))

    oc.applyRecommendedLabels(processResult, params.NAME, 'dev', '1')

    oc.fetchSecretsAndConfigMaps(processResult)

    stubAction
    .withArgs(
      ['--namespace=csnr-devops-lab-tools', 'apply', '-f', '-', '--output=name'],
      JSON.stringify(oc.wrapOpenShiftList(processResult)),
    )
    .returns({
      status: 0,
      stdout: `imagestream.image.openshift.io/${params.NAME}-core\nimagestream.image.openshift.io/${params.NAME}\nbuildconfig.build.openshift.io/${params.NAME}-core\nbuildconfig.build.openshift.io/${params.NAME}`,
    })

    const filterByFullName = (fullNames: string[]) => {
      const subset: string[] = processResult.filter((item: string) => {
        const fullName: string = Util.fullName(item)
        return fullNames.includes(fullName)
      })
      return subset
    }
    const subset1 = filterByFullName([
      'csnr-devops-lab-tools/buildconfig.build.openshift.io/my-test-app-core',
      'csnr-devops-lab-tools/buildconfig.build.openshift.io/my-test-app',
    ])

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'get',
      'buildconfig.build.openshift.io/my-test-app-core',
      'buildconfig.build.openshift.io/my-test-app',
      '--output=json',
    ])
    .returns({status: 0, stdout: JSON.stringify(oc.wrapOpenShiftList(subset1))})

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'get',
      'imagestream.image.openshift.io/my-test-app-core',
      '--output=json',
    ])
    .returns({
      status: 0,
      stdout: JSON.stringify(
        oc.wrapOpenShiftList(
          filterByFullName([
            'csnr-devops-lab-tools/imagestream.image.openshift.io/my-test-app-core',
          ]),
        ),
      ),
    })

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'get',
      'imagestream.image.openshift.io/my-test-app',
      '--output=json',
    ])
    .returns({
      status: 0,
      stdout: JSON.stringify(
        oc.wrapOpenShiftList(
          filterByFullName(['csnr-devops-lab-tools/imagestream.image.openshift.io/my-test-app']),
        ),
      ),
    })

    stubAction
    .withArgs([
      '--namespace=openshift',
      'get',
      'imagestream.image.openshift.io/python',
      '--output=json',
    ])
    .returns({
      status: 0,
      stdout: fs.readFileSync(
        `${__dirname}/resources/oc-607be20fff1241a2cd34534dfcadf0add63db2f9.cache.json`,
        {encoding: 'utf-8'},
      ),
    })

    stubAction
    .withArgs([
      '--namespace=openshift',
      'get',
      'ImageStreamTag/python:2.7',
      '--output=jsonpath={.image.metadata.name}',
    ])
    .returns({
      status: 0,
      stdout: fs.readFileSync(
        `${__dirname}/resources/oc-0c27ba108b45b02184fb3c2d9f17c15e1ebe5eb0.cache.txt`,
        {encoding: 'utf-8'},
      ),
    })

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'set',
      'env',
      'buildconfig.build.openshift.io/my-test-app-core',
      '--env=_BUILD_HASH=5c797a4d69cd9bebfb03c0fcf8cac94c68648c4b',
      '--overwrite=true',
    ])
    .returns({status: 0, stdout: 'not-used'})

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'set',
      'env',
      'buildconfig.build.openshift.io/my-test-app',
      '--env=_BUILD_HASH=bb6a1a5882cc91915f31c620482bacb8070deb3f',
      '--overwrite=true',
    ])
    .returns({status: 0, stdout: 'not-used'})

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'start-build',
      'buildconfig.build.openshift.io/my-test-app-core',
      '--wait=true',
      '--output=name',
    ])
    .returns({status: 0, stdout: 'Build/my-test-app-core-1'})

    const build1 = {
      kind: 'Build',
      metadata: {
        name: 'my-test-app-core-1',
        namespace: 'csnr-devops-lab-tools',
      },
      status: {
        phase: 'Complete',
      },
    }

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'get',
      'Build/my-test-app-core-1',
      '--output=json',
    ])
    .returns({status: 0, stdout: JSON.stringify(build1)})

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'start-build',
      'buildconfig.build.openshift.io/my-test-app',
      '--wait=true',
      '--output=name',
    ])
    .returns({status: 0, stdout: 'Build/my-test-app-1'})

    const build2 = {
      kind: 'Build',
      metadata: {
        name: 'my-test-app-1',
        namespace: 'csnr-devops-lab-tools',
      },
      status: {
        phase: 'Complete',
      },
    }

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'get',
      'Build/my-test-app-1',
      '--output=json',
    ])
    .returns({status: 0, stdout: JSON.stringify(build2)})

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'get',
      'ImageStreamTag/my-test-app-core:latest',
      '--output=jsonpath={.image.metadata.name}',
    ])
    .returns({
      status: 0,
      stdout: fs.readFileSync(
        `${__dirname}/resources/oc-a1d829dffc04a39da661796a53dc512a6ead6033.cache.json`,
        {encoding: 'utf-8'},
      ),
    })

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'set',
      'env',
      'buildconfig.build.openshift.io/my-test-app-core',
      '--env=_BUILD_HASH=4f9cc34cf9a4194b2f08f11a3cb995d79553a767',
      '--overwrite=true',
    ])
    .returns({status: 0, stdout: ''})

    stubAction
    .withArgs([
      '--namespace=csnr-devops-lab-tools',
      'set',
      'env',
      'buildconfig.build.openshift.io/my-test-app',
      '--env=_BUILD_HASH=04b941ded32c1b82c93b089d5c4bb6f227ea3786',
      '--overwrite=true',
    ])
    .returns({status: 0, stdout: ''})

    stubExecSync
    .withArgs('git', ['rev-parse', 'HEAD:app-base'], {cwd: BASEDIR, encoding: 'utf-8'})
    .returns({status: 0, stdout: '123456'})
    stubExecSync
    .withArgs('git', ['rev-parse', 'HEAD:app'], {cwd: BASEDIR, encoding: 'utf-8'})
    .returns({status: 0, stdout: '123456'})
    // stubExecSync.onCall(0).returns({status:0, stdout:'123456'})

    const applyResult = oc.apply(processResult)
    expect(applyResult).toBeInstanceOf(OpenShiftResourceSelector)
    expect(applyResult.names()).toEqual([
      `imagestream.image.openshift.io/${params.NAME}-core`,
      `imagestream.image.openshift.io/${params.NAME}`,
      `buildconfig.build.openshift.io/${params.NAME}-core`,
      `buildconfig.build.openshift.io/${params.NAME}`,
    ])
    const bc = applyResult.narrow('bc')
    expect(bc.names()).toEqual([
      `buildconfig.build.openshift.io/${params.NAME}-core`,
      `buildconfig.build.openshift.io/${params.NAME}`,
    ])

    await bc.startBuild({wait: 'true'})
  }) // end it

  // eslint-disable-next-line func-names,space-before-function-paren,prefer-arrow-callback
  it('build', async function() {
    const params = {NAME: 'my-test-app'}
    const stubAction = sandbox.stub(oc, '_action')
    const stubExecSync = sandbox.stub(Util, 'execSync')

    // eslint-disable-next-line func-names,space-before-function-paren,prefer-arrow-callback
    stubAction.callsFake(function fakeFn(...args: any) {
      throw new Error(`Not Implemented - oc._action: ${JSON.stringify(args)}`)
    })

    // eslint-disable-next-line func-names,space-before-function-paren,prefer-arrow-callback
    stubExecSync.callsFake(function fakeFn(...args: any) {
      throw new Error(`Not Implemented - Util.execSync: ${JSON.stringify(args)}`)
    })

    const objects = []
    const filePath = `${__dirname}/resources/bc.template.json`

    const processTemplate = (template: any, parameters: any) => {
      const processed = process(template, template, parameters)
      return oc.wrapOpenShiftList(processed.objects)
    }

    const processedTemplate = processTemplate(useCase0BuildTemplate, params)
    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'process', '-f', `${BASEDIR}/test/resources/bc.template.json`, `--param=NAME=${params.NAME}`, '--output=json'], // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: JSON.stringify(processedTemplate)}) // eslint-disable-line prettier/prettier,max-len

    stubExecSync.withArgs(
      'git', ['init', '-q', '/tmp/fc2dcf724ddb37bc0851a853b8a35eee7c0956ee'], {cwd: '/tmp', encoding: 'utf-8'}, // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0}) // eslint-disable-line prettier/prettier,max-len

    stubExecSync.withArgs(
      'git', ['remote', 'add', 'origin', 'https://github.com/cvarjao-o/hello-world.git'], {cwd: '/tmp/fc2dcf724ddb37bc0851a853b8a35eee7c0956ee', encoding: 'utf-8'}, // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0}) // eslint-disable-line prettier/prettier,max-len

    stubExecSync.withArgs(
      'git', ['fetch', '--depth', '1', '--no-tags', '--update-shallow', 'origin', 'WIP:WIP'], {cwd: '/tmp/fc2dcf724ddb37bc0851a853b8a35eee7c0956ee', encoding: 'utf-8'}, // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0}) // eslint-disable-line prettier/prettier,max-len

    stubExecSync.withArgs(
      'git', ['clean', '-fd'], {cwd: '/tmp/fc2dcf724ddb37bc0851a853b8a35eee7c0956ee'}, // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0}) // eslint-disable-line prettier/prettier,max-len

    stubExecSync.withArgs(
      'git', ['fetch', '--depth', '1', '--no-tags', '--update-shallow', 'origin', 'WIP'], {cwd: '/tmp/fc2dcf724ddb37bc0851a853b8a35eee7c0956ee'}, // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0}) // eslint-disable-line prettier/prettier,max-len

    stubExecSync.withArgs(
      'git', ['checkout', 'WIP'], {cwd: '/tmp/fc2dcf724ddb37bc0851a853b8a35eee7c0956ee'}, // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0}) // eslint-disable-line prettier/prettier,max-len

    stubExecSync.withArgs(
      'git', ['rev-parse', 'WIP:app-base'], {cwd: '/tmp/fc2dcf724ddb37bc0851a853b8a35eee7c0956ee', encoding: 'utf-8'}, // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: '123456'}) // eslint-disable-line prettier/prettier,max-len

    stubExecSync.withArgs(
      'git', ['rev-parse', 'WIP:app'], {cwd: '/tmp/fc2dcf724ddb37bc0851a853b8a35eee7c0956ee', encoding: 'utf-8'}, // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: '123456'}) // eslint-disable-line prettier/prettier,max-len

    objects.push(...oc.processBuidTemplate(oc.toFileUrl(filePath), {param: params}))
    expect(objects).toHaveLength(4)
    const phase = {name: params.NAME, changeId: 0, instance: `${params.NAME}-0`}
    oc.applyRecommendedLabels(objects, phase.name, 'build', `${phase.changeId}`, phase.instance)
    const recommendedLabels = {}
    oc.copyRecommendedLabels(objects[0].metadata.labels, recommendedLabels)
    expect(recommendedLabels).toEqual({
      app: 'my-test-app-0',
      'app-name': 'my-test-app',
      'env-id': 0,
      'env-name': 'build',
      'github-owner': 'bcdevops',
      'github-repo': 'pipeline-cli',
    })
    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'apply', '-f', '-', '--output=name'], JSON.stringify(oc.wrapOpenShiftList(objects)), // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: 'abc\n123'}) // eslint-disable-line prettier/prettier,max-len

    await oc.applyAndBuild(objects)
  })

  // eslint-disable-next-line func-names,space-before-function-paren,prefer-arrow-callback
  it('deploy - @this', async function() {
    const params = {NAME: 'my-test-app'}
    const stubAction = sandbox.stub(oc, '_action')
    const stubExecSync = sandbox.stub(Util, 'execSync')
    const stubRawAction = sandbox.stub(oc, '_rawAction')

    // eslint-disable-next-line func-names,space-before-function-paren,prefer-arrow-callback
    stubAction.callsFake(function fakeFn(...args: any) {
      throw new Error(`Not Implemented: ._action(${JSON.stringify(args)})`)
    })

    // eslint-disable-next-line func-names,space-before-function-paren,prefer-arrow-callback
    stubRawAction.callsFake(function fakeFn(...args: any) {
      throw new Error(`Not Implemented: ._rawAction(${JSON.stringify(args)})`)
    })

    // eslint-disable-next-line func-names,space-before-function-paren,prefer-arrow-callback
    stubExecSync.callsFake(function fakeFn(...args: any) {
      throw new Error(`Not Implemented: ${JSON.stringify(args)}`)
    })

    const objects = []
    const filePath = `${__dirname}/resources/dc.template.json`

    const processTemplate = (template: any, parameters: any) => {
      const processed = process(template, template, parameters)
      return oc.wrapOpenShiftList(processed.objects)
    }

    const processedTemplate = processTemplate(useCase0DeployTemplate, params)

    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'process', '-f', `${BASEDIR}/test/resources/dc.template.json`, '--param=NAME=my-test-app', '--output=json'], // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: JSON.stringify(processedTemplate)}) // eslint-disable-line prettier/prettier,max-len

    objects.push(...oc.processDeploymentTemplate(oc.toFileUrl(filePath), {param: params}))
    expect(objects).toHaveLength(3)
    const phase = {name: params.NAME, changeId: 0, instance: `${params.NAME}-0`}
    oc.applyRecommendedLabels(objects, phase.name, 'dev', `${phase.changeId}`, phase.instance)
    const recommendedLabels = {}
    oc.copyRecommendedLabels(objects[0].metadata.labels, recommendedLabels)
    expect(recommendedLabels).toEqual({
      app: 'my-test-app-0',
      'app-name': 'my-test-app',
      'env-id': 0,
      'env-name': 'dev',
      'github-owner': 'bcdevops',
      'github-repo': 'pipeline-cli',
    })
    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'apply', '-f', '-', '--output=name'], JSON.stringify(oc.wrapOpenShiftList(objects)), // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: 'abc\n123'}) // eslint-disable-line prettier/prettier,max-len

    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'get', 'ImageStreamTag/abc:123', '--output=json', '--ignore-not-found=true'], // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: '{"kind": "ImageStreamTag", "metadata": { "name": "abc:123" }, "image": { "metadata": { "name": "some-gui" } } }'}) // eslint-disable-line prettier/prettier,max-len

    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'get', 'dc', '--selector=app=my-test-app-0', '--output=template={{range .items}}{{.metadata.name}}{{"\\t"}}{{.spec.replicas}}{{"\\t"}}{{.status.latestVersion}}{{"\\n"}}{{end}}'], // eslint-disable-line prettier/prettier,max-len
    ) // eslint-disable-line prettier/prettier,max-len,indent
    .onFirstCall()
.returns({status: 0, stdout: 'my-test-app-0\t1\t1'}) // eslint-disable-line prettier/prettier,max-len,indent
    .returns({status: 0, stdout: 'my-test-app-0\t1\t2'}) // eslint-disable-line prettier/prettier,max-len,indent,newline-per-chained-call

    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'get', 'Secret/template.my-test-app', '--output=json'], // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: JSON.stringify({metadata: {}, data: {username: 'username', password: 'password'}})}) // eslint-disable-line prettier/prettier,max-len

    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'get', 'ConfigMap/template.my-test-app', '--output=json'], // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: JSON.stringify({metadata: {}, data: {config1: 'username', config2: 'password'}})}) // eslint-disable-line prettier/prettier,max-len

    // oc.createIfMissing(objects);
    oc.waitForImageStreamTag('abc:123')

    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'get', 'imagestream.image.openshift.io/my-test-app', '--output=jsonpath={.status.dockerImageRepository}'], // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: 'docker-registry.default.svc:5000/csnr-devops-lab-tools/my-test-app'}) // eslint-disable-line prettier/prettier,max-len

    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'get', 'ImageStreamTag/my-test-app:build-1.0-0', '--output=jsonpath={.image.metadata.name}'], // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: 'my-test-app@1786a7f1-66a6-47a6-8ec4-be14a7a8ee02'}) // eslint-disable-line prettier/prettier,max-len

    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'delete', 'ImageStreamTag/my-test-app:temp1-v1.0', 'ImageStreamTag/my-test-app:temp2-v1.0', '--ignore-not-found=true', '--wait=true', '--output=name'], // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: 'my-test-app:temp1-v1.0'}) // eslint-disable-line prettier/prettier,max-len

    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'get', 'ImageStreamTag/my-test-app:v1.0', '--output=json', '--ignore-not-found=true'], // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: JSON.stringify({kind: 'ImageStreamTag', metadata: {name: 'my-test-app:v1.0'}, image: {metadata: {name: 'my-test-app@1786a7f1-66a6-47a6-8ec4-be14a7a8ee02'}}})}) // eslint-disable-line prettier/prettier,max-len

    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'tag', 'csnr-devops-lab-tools/my-test-app:build-1.0-0', 'my-test-app:v1.0', '--reference-policy=local'], // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: ''}) // eslint-disable-line prettier/prettier,max-len

    oc.importImageStreams(objects, 'v1.0', 'csnr-devops-lab-tools', 'build-1.0-0')
    oc.fetchSecretsAndConfigMaps(objects)

    stubAction.withArgs(
      ['--namespace=csnr-devops-lab-tools', 'apply', '-f', '-', '--output=name'], JSON.stringify(oc.wrapOpenShiftList(objects)), // eslint-disable-line prettier/prettier,max-len
    ).returns({status: 0, stdout: ''}) // eslint-disable-line prettier/prettier,max-len

    const stubActionAsync = sandbox.stub(oc, '_actionAsync')
    // eslint-disable-next-line func-names,space-before-function-paren,prefer-arrow-callback
    stubActionAsync.callsFake(function fakeFn(...args: any) {
      throw new Error(`Not Implemented: ${JSON.stringify(args)}`)
    })

    const createProc = () => {
      const proc = new EventEmitter()
      proc.stdout = new EventEmitter()
      proc.stderr = new EventEmitter()
      // proc.kill = () => {}
      setTimeout(() => {
        proc.stdout.emit('data', 'my-test-app-0\t1\t1\t1\t4\n')
        proc.emit('exit', null, 0)
      }, 2000)
      return proc
    }

    // eslint-disable-next-line max-len
    // eslint-disable-next-line func-names, space-before-function-paren, prefer-arrow-callback, prettier/prettier, max-len
    stubActionAsync.withArgs(
      ["--namespace=csnr-devops-lab-tools", "get", "dc", "--selector=app=my-test-app-0", "--watch=true"], // eslint-disable-line prettier/prettier,quotes,max-len
    ).returns(createProc()) // eslint-disable-line prettier/prettier,max-len

    // eslint-disable-next-line max-len
    // eslint-disable-next-line func-names, space-before-function-paren, prefer-arrow-callback, prettier/prettier, max-len
    stubAction.withArgs(
      ["--namespace=csnr-devops-lab-tools", "get", "dc", "--selector=app=my-test-app-0", "--no-headers=true", "--output=custom-columns=NAME:.metadata.name,DESIRED:.spec.replicas,CURRENT:.status.replicas,AVAILABLE:.status.availableReplicas,UNAVAILABLE:.status.unavailableReplicas,VERSION:.status.latestVersion"], // eslint-disable-line prettier/prettier,quotes,max-len
    ).returns({status: 0, stdout: 'my-test-app-0\t1\t1\t1\t4\n'}) // eslint-disable-line prettier/prettier,max-len

    await oc.applyAndDeploy(objects, 'thing')
  })
}) // end describe
