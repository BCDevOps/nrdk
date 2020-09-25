nrdk
====



[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@bcgov/nrdk.svg)](https://www.npmjs.com/package/@bcgov/nrdk)
[![Downloads/week](https://img.shields.io/npm/dw/@bcgov/nrdk.svg)](https://www.npmjs.com/package/@bcgov/nrdk)
[![License](https://img.shields.io/npm/l/@bcgov/nrdk.svg)](https://github.com/cvarjao/nrdk/blob/master/package.json)

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
@bcgov/nrdk/0.1.0-rc.39 darwin-x64 node-v12.14.1
$ nrdk --help [COMMAND]
USAGE
  $ nrdk COMMAND
...
```
<!-- usagestop -->

The CLI can also be run with npx:
```sh-session
$ npx @bcgov/nrdk (-v|--version|version)
$ npx @bcgov/nrdk --help [COMMAND]
USAGE
  $ nrdk COMMAND
```

# Commands
<!-- commands -->
* [`nrdk backlog:checkin`](#nrdk-backlogcheckin)
* [`nrdk backlog:checkout [ISSUE]`](#nrdk-backlogcheckout-issue)

## `nrdk backlog:checkin`

Push local changes (commits) to the remote repository

```
USAGE
  $ nrdk backlog:checkin
```

_See code: [src/commands/backlog/checkin.ts](./src/commands/backlog/checkin.ts)_

## `nrdk backlog:checkout [ISSUE]`

Create (if required), and checkout the git branch supporting a Jira issue (bug, new feature, improvement, etc...)

```
USAGE
  $ nrdk backlog:checkout [ISSUE]

ARGUMENTS
  ISSUE  Jira issue key (e.g.: WEBADE-123)

OPTIONS
  -b, --branch=branch          Remote Branch Name
  -p, --project=project        BitBucket Project/Group Name
  -r, --repository=repository  BitBucket Repository Name
```

_See code: [src/commands/backlog/checkout.ts](./src/commands/backlog/checkout.ts)_
<!-- commandsstop -->
