Troubleshooting
====

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


### Error: EPERM: operation not permitted, rename '...' -> '...'

Several type definitions, like `@types/rsync` will cause this error when used as prod dependencies.  Review `package.json` dependencies and run `npm i`.  Please be aware this will replace `package-lock.json`!.
