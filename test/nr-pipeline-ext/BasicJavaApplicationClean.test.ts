'use strict'
const expect = require('expect')
const sandbox = require('sinon').createSandbox()
const {ENV} = require('../lib/constants')
const {OpenShiftClientX} = require('@bcgov/pipeline-cli')
const BasicJavaApplicationClean = require('../lib/BasicJavaApplicationClean')

describe('BasicJavaApplicationClean:', function () {
  this.timeout(50000)

  let cleaner
  const defaultSettings = getDefaultSettings() // do not modify this settings.
  let ocGetStub
  let ocDeleteStub
  let ocRawStub

  this.beforeEach(function () {
    cleaner = new BasicJavaApplicationClean(defaultSettings)
    ocGetStub = sandbox.stub(OpenShiftClientX.prototype, 'get')
    ocDeleteStub = sandbox.stub(OpenShiftClientX.prototype, 'delete')
    ocRawStub = sandbox.stub(OpenShiftClientX.prototype, 'raw')
  })

  this.afterEach(function () {
    sandbox.restore()
  })

  context('Obtaining target phase(s)', function () {
    it("Argument for env='all', it should include targets for: 'build' and 'dev' as current target phases.", function () {
      const targetPhases = cleaner.getTargetPhases('all')
      expect(targetPhases).toContain(ENV.BUILD)
      expect(targetPhases).toContain(ENV.DEV)
      expect(targetPhases).not.toContain(ENV.DLVR)
      expect(targetPhases).not.toContain(ENV.TEST)
      expect(targetPhases).not.toContain(ENV.PROD)
    })

    it("Argument for env='transient', it should include targets for: 'build' and 'dev' as current target phases.", function () {
      const targetPhases = cleaner.getTargetPhases('transient')
      expect(targetPhases).toContain(ENV.BUILD)
      expect(targetPhases).toContain(ENV.DEV)
      expect(targetPhases).not.toContain(ENV.DLVR)
      expect(targetPhases).not.toContain(ENV.TEST)
      expect(targetPhases).not.toContain(ENV.PROD)
    })

    it("Argument for env='test', it should only have 'test' as target phase.", function () {
      const targetPhases = cleaner.getTargetPhases('test')
      expect(targetPhases).not.toContain(ENV.BUILD)
      expect(targetPhases).not.toContain(ENV.DEV)
      expect(targetPhases).not.toContain(ENV.DLVR)
      expect(targetPhases).toContain(ENV.TEST)
      expect(targetPhases).not.toContain(ENV.PROD)
    })
  })

  context('Call clean to delete objects for a target phase', function () {
    it("When no 'bc/dc' can be found based on settings, no deletion on bc/dc will be called.", async function () {
      // Arrange
      const settingCopy = Object.assign(defaultSettings)
      settingCopy.options.env = 'dlvr'
      ocGetStub.withArgs(sandbox.match('bc')).returns(undefined)
      ocGetStub.withArgs(sandbox.match('dc')).returns(undefined)

      // Act
      cleaner = new BasicJavaApplicationClean(settingCopy)
      await cleaner.clean()

      // Verify
      sandbox.assert.calledTwice(ocGetStub)
      sandbox.assert.notCalled(ocDeleteStub)
      sandbox.assert.called(ocRawStub)
    })

    it('When there is a target phase, it will call oc to delete all objects in the environment.', async function () {
      // Arrange
      const settingCopy = Object.assign(defaultSettings)
      settingCopy.options.env = 'dlvr' // set this to prepare first for the rest.

      const phase = settingCopy.phases[settingCopy.options.env]
      const options = settingCopy.options

      const bcCopies = getRandomBcOrDc(3, 'bc')
      const numBcCopies = bcCopies.length
      ocGetStub.withArgs(sandbox.match('bc')).returns(bcCopies)
      const dcCopies = getRandomBcOrDc(4, 'dc')
      const numDcCopies = dcCopies.length
      ocGetStub.withArgs(sandbox.match('dc')).returns(dcCopies)

      // Act
      cleaner = new BasicJavaApplicationClean(settingCopy)
      cleaner.clean()

      // Verify
      sandbox.assert.called(ocGetStub)
      sandbox.assert.called(ocDeleteStub)
      for (let i = 0; i < numBcCopies; i++) {
        sandbox.assert.calledWith(ocDeleteStub, [`ImageStreamTag/${bcCopies[i].spec.output.to.name}`], {
          'ignore-not-found': 'true',
          wait: 'true',
          namespace: phase.namespace,
        })
      }
      for (let i = 0; i < numDcCopies; i++) {
        sandbox.assert.calledWith(
          ocDeleteStub,
          [`ImageStreamTag/${dcCopies[i].spec.triggers[0].imageChangeParams.from.name}`],
          {'ignore-not-found': 'true', wait: 'true', namespace: phase.namespace},
        )
      }
      sandbox.assert.called(ocRawStub)
      sandbox.assert.calledWith(ocRawStub, 'delete', ['all'], {
        selector: `app=${phase.instance},env-id=${phase.changeId},!shared,github-repo=${options.git.repository},github-owner=${options.git.owner}`,
        wait: 'true',
        namespace: phase.namespace,
      })
      sandbox.assert.calledWith(
        ocRawStub,
        'delete',
        ['pvc,Secret,configmap,endpoints,RoleBinding,role,ServiceAccount,Endpoints'],
        {
          selector: `app=${phase.instance},env-id=${phase.changeId},!shared,github-repo=${options.git.repository},github-owner=${options.git.owner}`,
          wait: 'true',
          namespace: phase.namespace,
        },
      )
    })
  })

  context('Call clean to delete objects for transient target when user spcify env=all/transient', function () {
    it("When no 'bc/dc' can be found based on settings, no deletion on bc/dc will be called.", async function () {
      // Arrange
      const settingCopy = Object.assign(defaultSettings)
      settingCopy.options.env = 'all'
      ocGetStub.withArgs(sandbox.match('bc')).returns(undefined)
      ocGetStub.withArgs(sandbox.match('dc')).returns(undefined)
      cleaner = new BasicJavaApplicationClean(settingCopy)
      const resolvedTargetphases = ['build', 'dev']
      sandbox
      .mock(cleaner)
      .expects('getTargetPhases')
      .withArgs(settingCopy.options.env)
      .returns(resolvedTargetphases)
      // Act
      await cleaner.clean()

      // Verify
      sandbox.assert.callCount(ocGetStub, resolvedTargetphases.length * 2)
      sandbox.assert.notCalled(ocDeleteStub)
      sandbox.assert.called(ocRawStub)
    })

    it("When 'bc/dc' found, will do clean objects on each of the target phases", async function () {
      // Arrange
      const settingCopy = Object.assign(defaultSettings)
      settingCopy.options.env = 'transient' // set this to prepare first for the rest.

      const options = settingCopy.options
      const resolvedTargetphases = ['build', 'dev']
      sandbox
      .mock(cleaner)
      .expects('getTargetPhases')
      .withArgs(settingCopy.options.env)
      .returns(resolvedTargetphases)
      const bcCopies = getRandomBcOrDc(2, 'bc')
      const numBcCopies = bcCopies.length
      ocGetStub.withArgs(sandbox.match('bc')).returns(bcCopies)
      const dcCopies = getRandomBcOrDc(3, 'dc')
      const numDcCopies = dcCopies.length
      ocGetStub.withArgs(sandbox.match('dc')).returns(dcCopies)

      // Act
      cleaner = new BasicJavaApplicationClean(settingCopy)
      cleaner.clean()

      // Verify
      sandbox.assert.callCount(ocGetStub, resolvedTargetphases.length * 2)
      sandbox.assert.callCount(ocRawStub, resolvedTargetphases.length * 2)
      for (let i = 0; i < resolvedTargetphases.length; i++) {
        const targetPhase = resolvedTargetphases[i]
        const phase = settingCopy.phases[targetPhase]
        sandbox.assert.calledWith(ocGetStub, 'bc', {
          selector: `app=${phase.instance},env-id=${phase.changeId},!shared,github-repo=${options.git.repository},github-owner=${options.git.owner}`,
          namespace: phase.namespace,
        })
        sandbox.assert.calledWith(ocGetStub, 'dc', {
          selector: `app=${phase.instance},env-id=${phase.changeId},env-name=${targetPhase},!shared,github-repo=${options.git.repository},github-owner=${options.git.owner}`,
          namespace: phase.namespace,
        })

        for (let i = 0; i < numBcCopies; i++) {
          sandbox.assert.calledWith(ocDeleteStub, [`ImageStreamTag/${bcCopies[i].spec.output.to.name}`], {
            'ignore-not-found': 'true',
            wait: 'true',
            namespace: phase.namespace,
          })
        }
        for (let i = 0; i < numDcCopies; i++) {
          sandbox.assert.calledWith(
            ocDeleteStub,
            [`ImageStreamTag/${dcCopies[i].spec.triggers[0].imageChangeParams.from.name}`],
            {'ignore-not-found': 'true', wait: 'true', namespace: phase.namespace},
          )
        }

        sandbox.assert.calledWith(ocRawStub, 'delete', ['all'], {
          selector: `app=${phase.instance},env-id=${phase.changeId},!shared,github-repo=${options.git.repository},github-owner=${options.git.owner}`,
          wait: 'true',
          namespace: phase.namespace,
        })
        sandbox.assert.calledWith(
          ocRawStub,
          'delete',
          ['pvc,Secret,configmap,endpoints,RoleBinding,role,ServiceAccount,Endpoints'],
          {
            selector: `app=${phase.instance},env-id=${phase.changeId},!shared,github-repo=${options.git.repository},github-owner=${options.git.owner}`,
            wait: 'true',
            namespace: phase.namespace,
          },
        )
      }
    })
  })
}) // end BasicJavaApplicationDeployer unit tests.

/**
 * This function randomly return array of buildConfig (from sameple one); which
 * bc copies: only has '.spec.output.to.name' difference for now.
 * dc copies: only has '.spec.triggers[n].imageChangeParams.from.name' difference for now.
 * @param max max number of copies
 * @param template bc/dc
 */
function getRandomBcOrDc(max, template) {
  // bcTestCopy
  const num = Math.floor(Math.random() * max) + 1 // num between 1..n
  const testCopies = []
  for (let i = 0; i < num; i++) {
    let testCopy
    if (template === 'bc') {
      testCopy = Object.assign(bcTestCopy)
      testCopy.spec.output.to.name = Math.random()
      .toString(36)
      .slice(2)
    } else if (template === 'dc') {
      testCopy = Object.assign(dcTestCopy)
      testCopy.spec.triggers[0].imageChangeParams.from.name =
                'myapp:dev-1.0-' +
                Math.random()
                .toString(36)
                .slice(2, 4)
    }

    testCopies.push(testCopy)
  }

  return testCopies
} // end getRandomBc()

function getDefaultSettings() {
  const defaultSettings = {
    phases: {
      build: {
        namespace: 'wp9gel-tools',
        name: 'siwe',
        phase: 'build',
        changeId: '99',
        suffix: '-build-99',
        tag: 'build-1.0-99',
        instance: 'siwe-build-99',
        transient: true,
        host: '',
        credentials: {
          idir: {
            user: 'fake@gov.bc.ca',
            pass: 'fakePass',
          },
        },
      },
      dev: {
        namespace: 'wp9gel-dev',
        name: 'siwe',
        phase: 'dev',
        changeId: '99',
        suffix: '-dev-99',
        tag: 'dev-1.0-99',
        instance: 'siwe-dev-99',
        transient: true,
        host: 'siwe-dev-99-wp9gel-dev.pathfinder.bcgov',
        credentials: {
          idir: {
            user: 'fake@gov.bc.ca',
            pass: 'fakePass',
          },
        },
      },
      dlvr: {
        namespace: 'wp9gel-dev',
        name: 'siwe',
        phase: 'dev',
        changeId: '99',
        suffix: '-dlvr',
        tag: 'dlvr-1.0',
        instance: 'siwe-dlvr',
        transient: false,
        host: 'siwe-dlvr-wp9gel-dev.pathfinder.bcgov',
        credentials: {
          idir: {
            user: 'fake@gov.bc.ca',
            pass: 'fakePass',
          },
        },
      },
      test: {
        namespace: 'wp9gel-test',
        name: 'siwe',
        phase: 'test',
        changeId: '99',
        suffix: '-test',
        tag: 'test-1.0',
        instance: 'siwe-test',
        transient: false,
        host: 'siwe-test-wp9gel-test.pathfinder.bcgov',
        credentials: {
          idir: {
            user: 'fake@gov.bc.ca',
            pass: 'fakePass',
          },
        },
      },
      prod: {
        namespace: 'wp9gel-prod',
        name: 'siwe',
        phase: 'prod',
        changeId: '99',
        suffix: '-prod',
        tag: 'prod-1.0',
        instance: 'siwe-prod-99',
        transient: false,
        host: 'siwe-prod-wp9gel-prod.pathfinder.bcgov',
        credentials: {
          idir: {
            user: 'fake@gov.bc.ca',
            pass: 'fakePass',
          },
        },
      },
    },
    options: {
      git: {
        branch: {
          name: 'feature/ZERO-1103-add-ha-capability',
          merge: 'feature/ZERO-1103-add-ha-capability',
          remote: 'feature/ZERO-1103-add-ha-capability',
        },
        url: 'https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git',
        change: {
          target: 'SIWE-73-test-siwe-pipeline-deployment',
        },
        dir: '/Users/someUser/Workspace/Repo/spi/spi-siwe-ear',
        uri: 'https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git',
        http_url: 'https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git',
        owner: 'SIWE',
        repository: 'siwe-siwe-ear',
        pull_request: '99',
        ref: 'refs/pull/99/head',
        branch_ref: 'refs/pull/99/head',
      },
      env: 'build',
      pr: '99',
      cwd: '/Users/someUser/Workspace/Repo/spi/spi-siwe-ear',
    },
    jiraUrl: 'bwa.nrs.gov.bc.ca/int/jira',
    bitbucketUrl: 'https://bwa.nrs.gov.bc.ca/int/stash',
    phase: 'build',
  }
  return defaultSettings
} // end getDefaultSettings()

const bcTestCopy = {
  apiVersion: 'build.openshift.io/v1',
  kind: 'BuildConfig',
  metadata: {
    annotations: {
      'kubectl.kubernetes.io/last-applied-configuration': '{some.very.long.configuration}',
    },
    creationTimestamp: '2019-12-16T22:53:52Z',
    labels: {
      app: 'myapp-build-0',
      'app-name': 'myapp',
      build: 'base-app-openshift',
      'env-id': '0',
      'env-name': 'build',
      'github-owner': 'OWNER',
      'github-repo': 'myapp-myapp-ear',
    },
    name: 'base-app-openshift',
    namespace: 'wp9gel-tools',
  },
  spec: {
    output: {
      to: {
        kind: 'ImageStreamTag',
        name: 'base-mapp-openshift:1.0-01',
      },
    },
    strategy: {
      dockerStrategy: {
        from: {
          kind: 'ImageStreamTag',
          name: 'openjdk18-openshift:1.0-01',
        },
      },
      type: 'Docker',
    },
  },
}

const dcTestCopy = {
  apiVersion: 'apps.openshift.io/v1',
  kind: 'DeploymentConfig',
  metadata: {
    annotations: {
      'kubectl.kubernetes.io/last-applied-configuration': '{some.very.long.dc.configuration}\n',
    },
    labels: {
      app: 'wiof-dev-0',
      'app-name': 'wiof',
      'env-id': '0',
      'env-name': 'dev',
      'github-owner': 'WIOF',
      'github-repo': 'wiof-wiof-ear',
    },
    name: 'wiof-dev-0',
    namespace: 'wp9gel-dev',
  },
  spec: {
    replicas: 2,
    revisionHistoryLimit: 10,
    selector: {
      deploymentConfig: 'wiof-dev-0',
    },
    strategy: {
      activeDeadlineSeconds: 21600,
      resources: {},
      rollingParams: {
        intervalSeconds: 1,
        maxSurge: '25%',
        maxUnavailable: '25%',
        timeoutSeconds: 600,
        updatePeriodSeconds: 1,
      },
      type: 'Rolling',
    },
    template: {
      metadata: {
        labels: {
          deploymentConfig: 'wiof-dev-0',
          name: 'wiof',
        },
        name: 'wiof',
      },
      spec: {
        containers: [
          {
            env: [
              {
                name: 'PORT',
                value: '8080',
              },
              {
                name: 'TNS_ADMIN',
                value: '/usr/local/tomcat/wallet/',
              },
              {
                name: 'OPENSHIFT_KUBE_PING_LABELS',
                value: 'deploymentConfig=wiof-dev-0',
              },
              {
                name: 'OPENSHIFT_KUBE_PING_NAMESPACE',
                valueFrom: {
                  fieldRef: {
                    apiVersion: 'v1',
                    fieldPath: 'metadata.namespace',
                  },
                },
              },
              {
                name: 'CATALINA_OPTS',
                value:
                                    '-Djava.security.egd=file:/dev/./urandom -agentlib:jdwp=transport=dt_socket,address=8090,server=y,suspend=n',
              },
            ],
            image:
                            'docker-registry.default.svc:5000/wp9gel-dev/wiof@sha256:48d7cfd66a22229b796f9881ff8c53fd0069a7d1e457739e4b0ba86ed5ca64fe',
            imagePullPolicy: 'IfNotPresent',
            livenessProbe: {
              failureThreshold: 3,
              httpGet: {
                path: '/pub/wiof/locationForm.do',
                port: 8080,
                scheme: 'HTTP',
              },
              initialDelaySeconds: 60,
              periodSeconds: 10,
              successThreshold: 1,
              timeoutSeconds: 3,
            },
            name: 'wiof',
            ports: [
              {
                containerPort: 8080,
                name: 'wiof',
                protocol: 'TCP',
              },
              {
                containerPort: 8778,
                name: 'jolokia',
                protocol: 'TCP',
              },
              {
                containerPort: 8443,
                protocol: 'TCP',
              },
              {
                containerPort: 8090,
                name: 'debug',
                protocol: 'TCP',
              },
            ],
            readinessProbe: {
              failureThreshold: 3,
              httpGet: {
                path: '/pub/wiof/locationForm.do',
                port: 8080,
                scheme: 'HTTP',
              },
              initialDelaySeconds: 25,
              periodSeconds: 10,
              successThreshold: 1,
              timeoutSeconds: 2,
            },
            resources: {
              limits: {
                cpu: '1',
                memory: '512Mi',
              },
              requests: {
                cpu: '500m',
                memory: '256Mi',
              },
            },
            terminationMessagePath: '/dev/termination-log',
            terminationMessagePolicy: 'File',
            volumeMounts: [
              {
                mountPath: '/usr/local/tomcat/webapps/pub#wiof/WEB-INF/lib/',
                name: 'newwebade',
              },
              {
                mountPath: '/usr/local/tomcat/logs/',
                name: 'logs',
              },
              {
                mountPath: '/apps_ux/logs/wiof/',
                name: 'wiof-dev-0-log-pvc',
              },
              {
                mountPath: '/apps_data/wiof/',
                name: 'wiof-dev-0-app-data',
              },
              {
                mountPath: '/usr/local/tomcat/wallet/',
                name: 'wallet',
              },
              {
                mountPath: '/usr/local/tomcat/webapps/pub#wiof/WEB-INF/classes',
                name: 'classes',
              },
              {
                mountPath: '/data/test',
                name: 'test-storage',
              },
            ],
          },
          {
            args: ['-config.file=/etc/promtail/promtail.yaml'],
            image: 'grafana/promtail:latest',
            imagePullPolicy: 'Always',
            name: 'promtail-container',
            resources: {},
            terminationMessagePath: '/dev/termination-log',
            terminationMessagePolicy: 'File',
            volumeMounts: [
              {
                mountPath: '/error_logs',
                name: 'wiof-dev-0-log-pvc',
              },
              {
                mountPath: '/etc/promtail',
                name: 'wiof-promtail-config',
              },
              {
                mountPath: '/access_logs',
                name: 'logs',
              },
            ],
          },
          {
            image: 'quay.io/prometheus/node-exporter',
            imagePullPolicy: 'Always',
            name: 'prometheus-sidecar',
            ports: [
              {
                containerPort: 9100,
                protocol: 'TCP',
              },
            ],
            resources: {},
            terminationMessagePath: '/dev/termination-log',
            terminationMessagePolicy: 'File',
            volumeMounts: [
              {
                mountPath: '/data/test',
                name: 'test-storage',
              },
            ],
          },
        ],
        dnsPolicy: 'ClusterFirst',
        initContainers: [
          {
            command: [
              'bash',
              '-c',
              'cp /usr/local/tomcat/webapps/pub#wiof/WEB-INF/lib/*.jar /newwebade \u0026\u0026 cp /webade/* /newwebade \u0026\u0026 cp -r /usr/local/tomcat/webapps/pub#wiof/WEB-INF/classes/* /classes \u0026\u0026 cp /webade-properties/* /classes',
            ],
            image:
                            'docker-registry.default.svc:5000/wp9gel-dev/wiof@sha256:48d7cfd66a22229b796f9881ff8c53fd0069a7d1e457739e4b0ba86ed5ca64fe',
            imagePullPolicy: 'IfNotPresent',
            name: 'init',
            resources: {},
            terminationMessagePath: '/dev/termination-log',
            terminationMessagePolicy: 'File',
            volumeMounts: [
              {
                mountPath: '/newwebade',
                name: 'newwebade',
              },
              {
                mountPath: '/webade',
                name: 'webade',
              },
              {
                mountPath: '/classes',
                name: 'classes',
              },
              {
                mountPath: '/webade-properties',
                name: 'webade-properties',
              },
            ],
          },
        ],
        restartPolicy: 'Always',
        schedulerName: 'default-scheduler',
        securityContext: {},
        serviceAccount: 'tomcat',
        serviceAccountName: 'tomcat',
        terminationGracePeriodSeconds: 30,
        volumes: [
          {
            emptyDir: {},
            name: 'newwebade',
          },
          {
            emptyDir: {},
            name: 'classes',
          },
          {
            emptyDir: {},
            name: 'launch',
          },
          {
            emptyDir: {},
            name: 'logs',
          },
          {
            name: 'webade-properties',
            secret: {
              defaultMode: 420,
              secretName: 'wiof-dev-0-webade-properties',
            },
          },
          {
            name: 'webade',
            secret: {
              defaultMode: 420,
              secretName: 'wiof-dev-0-webade-jar',
            },
          },
          {
            name: 'wallet',
            secret: {
              defaultMode: 420,
              secretName: 'wiof-dev-0-wallet',
            },
          },
          {
            name: 'wiof-dev-0-log-pvc',
            persistentVolumeClaim: {
              claimName: 'wiof-dev-0-log-pvc',
            },
          },
          {
            name: 'wiof-dev-0-app-data',
            persistentVolumeClaim: {
              claimName: 'wiof-dev-0-app-data',
            },
          },
          {
            configMap: {
              defaultMode: 420,
              name: 'wiof-promtail-config',
            },
            name: 'wiof-promtail-config',
          },
          {
            name: 'test-storage',
            persistentVolumeClaim: {
              claimName: 'my-volume-claim',
            },
          },
        ],
      },
    },
    test: false,
    triggers: [
      {
        imageChangeParams: {
          automatic: true,
          containerNames: ['wiof', 'init'],
          from: {
            kind: 'ImageStreamTag',
            name: 'wiof:dev-1.0-0',
            namespace: 'wp9gel-dev',
          },
          lastTriggeredImage:
                        'docker-registry.default.svc:5000/wp9gel-dev/wiof@sha256:48d7cfd66a22229b796f9881ff8c53fd0069a7d1e457739e4b0ba86ed5ca64fe',
        },
        type: 'ImageChange',
      },
      {
        type: 'ConfigChange',
      },
    ],
  },
  status: {
    availableReplicas: 2,
    conditions: [
      {
        lastTransitionTime: '2019-12-18T23:12:00Z',
        lastUpdateTime: '2019-12-18T23:12:04Z',
        message: 'replication controller "wiof-dev-0-20" successfully rolled out',
        reason: 'NewReplicationControllerAvailable',
        status: 'True',
        type: 'Progressing',
      },
      {
        lastTransitionTime: '2019-12-18T23:37:38Z',
        lastUpdateTime: '2019-12-18T23:37:38Z',
        message: 'Deployment config has minimum availability.',
        status: 'True',
        type: 'Available',
      },
    ],
    details: {
      causes: [
        {
          type: 'Manual',
        },
      ],
      message: 'manual change',
    },
    latestVersion: 20,
    observedGeneration: 85,
    readyReplicas: 2,
    replicas: 2,
    unavailableReplicas: 0,
    updatedReplicas: 2,
  },
}
