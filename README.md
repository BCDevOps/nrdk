nrdk
====



[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/nrdk.svg)](https://npmjs.org/package/nrdk)
[![CircleCI](https://circleci.com/gh/cvarjao/nrdk/tree/master.svg?style=shield)](https://circleci.com/gh/cvarjao/nrdk/tree/master)
[![Downloads/week](https://img.shields.io/npm/dw/nrdk.svg)](https://npmjs.org/package/nrdk)
[![License](https://img.shields.io/npm/l/nrdk.svg)](https://github.com/cvarjao/nrdk/blob/master/package.json)

<!-- toc -->
* [Prerequisites](#prerequisites)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Prerequisites
* Setup yout git CLI so that credentials are being cached. You can use the `store` or `cache` credential helper. PS.: Jenkins will do that automatically for you when running within a jenkins job.

# Usage
<!-- usage -->
```sh-session
$ npm install -g @bcgov/nrdk
$ nrdk COMMAND
running command...
$ nrdk (-v|--version|version)
@bcgov/nrdk/0.1.0-rc.21 darwin-x64 node-v12.14.1
$ nrdk --help [COMMAND]
USAGE
  $ nrdk COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`nrdk build`](#nrdk-build)
* [`nrdk clean`](#nrdk-clean)
* [`nrdk deploy`](#nrdk-deploy)
* [`nrdk help [COMMAND]`](#nrdk-help-command)
* [`nrdk on:jira.issue`](#nrdk-onjiraissue)

## `nrdk build`

describe the command here

```
USAGE
  $ nrdk build

OPTIONS
  -b, --git.branch.name=git.branch.name  GIT local branch name
  --dev-mode                             Developer Mode (local)
  --env=env                              Environment
  --git.branch.merge=git.branch.merge    GIT remote branch name
  --git.remote.name=git.remote.name      [default: origin] GIT remote name
  --git.remote.url=git.remote.url        GIT remote URL
  --pr=pr                                Pull Request number
```

_See code: [src/commands/build.ts](https://github.com/bcdevops/nrdk/blob/v0.1.0-rc.21/src/commands/build.ts)_

## `nrdk clean`

describe the command here

```
USAGE
  $ nrdk clean

OPTIONS
  -b, --git.branch.name=git.branch.name  GIT local branch name
  --env=env                              Environment
  --git.branch.merge=git.branch.merge    GIT remote branch name
  --git.remote.name=git.remote.name      [default: origin] GIT remote name
  --git.remote.url=git.remote.url        GIT remote URL
  --pr=pr                                Pull Request number
```

_See code: [src/commands/clean.ts](https://github.com/bcdevops/nrdk/blob/v0.1.0-rc.21/src/commands/clean.ts)_

## `nrdk deploy`

describe the command here

```
USAGE
  $ nrdk deploy

OPTIONS
  -b, --git.branch.name=git.branch.name  GIT local branch name
  --env=env                              Environment
  --git.branch.merge=git.branch.merge    GIT remote branch name
  --git.remote.name=git.remote.name      [default: origin] GIT remote name
  --git.remote.url=git.remote.url        GIT remote URL
  --pr=pr                                Pull Request number
```

_See code: [src/commands/deploy.ts](https://github.com/bcdevops/nrdk/blob/v0.1.0-rc.21/src/commands/deploy.ts)_

## `nrdk help [COMMAND]`

display help for nrdk

```
USAGE
  $ nrdk help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.1.0/src/commands/help.ts)_

## `nrdk on:jira.issue`

describe the command here

```
USAGE
  $ nrdk on:jira.issue

OPTIONS
  -b, --git.branch.name=git.branch.name  GIT local branch name
  --env=env                              Environment
  --git.branch.merge=git.branch.merge    GIT remote branch name
  --git.remote.name=git.remote.name      [default: origin] GIT remote name
  --git.remote.url=git.remote.url        GIT remote URL
```

_See code: [src/commands/on/jira.issue.ts](https://github.com/bcdevops/nrdk/blob/v0.1.0-rc.21/src/commands/on/jira.issue.ts)_
<!-- commandsstop -->
