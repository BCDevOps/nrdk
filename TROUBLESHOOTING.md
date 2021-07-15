Troubleshooting
====



<!-- toc -->
* [Prerequisites](#prerequisites)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Prerequisites

To get started install node_modules and build the *.js files in ./lib/.  Link may require sudo.

```
npm ci
npm run build
npm link
```

# Usage

Once configured nrdk can be run like any binary in the system path.  E.g.:

```
nrdk -h
nrdk -v
nrdk tool:terraform -v
```

The CLI can also be run with npx:
```sh-session
$ npx @bcgov/nrdk (-v|--version|version)
$ npx @bcgov/nrdk --help [COMMAND]
USAGE
  $ nrdk COMMAND
```

# Commands
