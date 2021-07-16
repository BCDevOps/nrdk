Development
====

#### Setup

Prerequisites:

* [Node.js 14 (LTS) and npm 6](https://nodejs.org/en/download/)

oc is required for OpenShift-related nrdk commands:

* [OpenShift Origin CLI 3.11.0](https://github.com/openshift/origin/releases)

Dependencies and TypeScript Builds:

```
npm ci
npm run build
npm link
```
*Link may require sudo.

Once configured nrdk can be run like any binary in the system path:

```
nrdk (-v|--version|version)
nrdk --help [COMMAND]
```
