Troubleshooting
====

<!-- toc -->
* [Setup](#setup)
* [Common Errors](#common-errors)

# Setup

Make sure nrdk is setup correctly.

Prerequisites:
* [Node.js 14 (LTS) and npm 6](https://nodejs.org/en/download/)
* [OpenShift Origin CLI 3.11.0](https://github.com/openshift/origin/releases)

Install node_modules and build the *.js files in ./lib/.  Link may require sudo.

```
npm ci
npm run build
npm link
```

Once configured nrdk can be run like any binary in the system path.  E.g.:

```
nrdk (-v|--version|version)
nrdk --help [COMMAND]
```

# Common Errors

### Error: Cannot find module '../lib'

Make sure all typescript has been built and copied to ./lib/.

```
npm run build
```

### Error: Cannot find module 'tslib'

Make sure node_modules have been installed and/or updated.

```
npm ci
```

### .git/hooks/pre-commit: line 2: ./node_modules/.bin/lint-staged: No such file or directory

This one is also related to node_modules.

```
npm ci
```

### stderr:error: the server doesn't have a resource type "secret"

Login to OpenShift.  Tokens are available behind a login from the [web console](https://oauth-openshift.apps.silver.devops.gov.bc.ca/oauth/token/request).



