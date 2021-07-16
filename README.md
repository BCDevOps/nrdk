nrdk
====


<!-- badges -->
[![img](https://img.shields.io/badge/Lifecycle-Experimental-339999)](https://github.com/bcgov/repomountie/blob/master/doc/lifecycle-badges.md)
[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@bcgov/nrdk.svg)](https://www.npmjs.com/package/@bcgov/nrdk)
[![Downloads/week](https://img.shields.io/npm/dw/@bcgov/nrdk.svg)](https://www.npmjs.com/package/@bcgov/nrdk)
[![License](https://img.shields.io/npm/l/@bcgov/nrdk.svg)](https://github.com/cvarjao/nrdk/blob/master/package.json)

<!-- toc -->
* [Prerequisites](#prerequisites)
* [Usage](#usage)
* [Commands](#commands)
* [Troubleshooting](#troubleshooting)
* [Development](#development)
* [Conduct](#conduct)

# Prerequisites
* Setup yout git CLI so that credentials are being cached. You can use the `store` or `cache` credential helper. PS.: Jenkins will do that automatically for you when running within a jenkins job.

# Usage
<!-- usage -->
```sh-session
$ npm install -g @bcgov/nrdk
$ nrdk COMMAND
running command...
$ nrdk (-v|--version|version)
@bcgov/nrdk/0.1.0-rc.119 linux-x64 node-v12.22.1
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
* [`nrdk help [COMMAND]`](#nrdk-help-command)

## `nrdk backlog:checkin`

On a Feature Branch, pushes local changes to the remote repository, and creates or updates a pull request to merge it into the Release branch.

```
USAGE
  $ nrdk backlog:checkin

EXAMPLES
  # nrdk backlog:checkout <Jira issue ID>
        # git add .
        # git commit -m "[Jira Issue] Adding new feature"
        # nrdk backlog:checkin
        Creates a new pull request merging branch Feature/[Jira Issue] into Release/<Jira Issue's Release's RFC's ID>
  # git branch // already on Feature/[Jira Issue]
        # git add .
        # git commit -m "[Jira Issue] Expanding on feature"
        # nrdk backlog:checkin
        Updates the existing pull request with the new commit(s).
```

_See code: [src/commands/backlog/checkin.ts](./src/commands/backlog/checkin.ts)_

## `nrdk backlog:checkout [ISSUE]`

Given a Jira Issue, checks out a Git branch named Feature/[Jira Issue] to resolve that Issue.

```
USAGE
  $ nrdk backlog:checkout [ISSUE]

ARGUMENTS
  ISSUE  Jira issue key (e.g.: WEBADE-123)

EXAMPLE
  # nrdk backlog:checkout IRS-200
        # git status
        On branch IRS-200
```

_See code: [src/commands/backlog/checkout.ts](./src/commands/backlog/checkout.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts).

# Troubleshooting

Please see [TROUBLESHOOTING.md](./dev/TROUBLESHOOTING.md).

# Development

Please see [DEVELOPER.md](./dev/DEVELOPER.md).

# Conduct

Please see [CONDUCT.md](./dev/CONDUCT.md).
