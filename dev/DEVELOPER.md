Development
====

## Setup

Prerequisites:

[Node.js 14 (LTS) and npm 6](https://nodejs.org/en/download/) are required.  Most package managers will support their installation.  Some common examples are provided.

```
# red hat, centos
sudo dnf install -y nodejs

# ubuntu, mint, debian
sudo apt-get update && sudo apt-get install -y nodejs
```

Alternatively, use [nvm](https://github.com/nvm-sh/nvm) to select a specific version for install.  This project uses 14.

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.0/install.sh | bash
source ~/.bashrc
nvm install v14 --lts
```

The [OpenShift Origin CLI](https://github.com/openshift/origin/releases) is required for OpenShift-related nrdk commands.

```
curl https://mirror.openshift.com/pub/openshift-v3/clients/3.11.286/linux/oc.tar.gz | tar zxf - -C /usr/local/bin
```

Install dependencies.

```
npm ci
```

Build TypeScript files from ./src/ into ./lib/ as JavaScript.  Repeat as changes are made.

```
npm run build
```

Link nrdk, allowing it to be run like any other local package.  Sudo may be required.

```
npm link
# OR sudo npm link
```

Run nrdk from any directory:

```
nrdk (-v|--version|version)
nrdk --help [COMMAND]
```

Optional: Login to OpenShift using a token from the [web console](https://oauth-openshift.apps.silver.devops.gov.bc.ca/oauth/token/request).  It will resemble the following:

```
oc login --token=<VARIES> --server=https://api.silver.devops.gov.bc.ca:6443
```

## Publishing

From the repository root new versions of nrdk may be published.  Expect changes in `package.json` and `package-lock.json`.

```
npm run publish:latest
```

## Size

Please keep dependencies to a minimum. This package is frequently run with `npx`, making size and performance issues much more apparent if bloat sets in.  Ideally bundled packages will be as lean as possible, including swapping larger packager for smaller ones.

Development dependencies should be carefully selected, but will not have the same impact on performance.

## Docker

This is useful to starting quickly, but not very practical, since nrdk is typically run from a separate app's git repository.

### Start

1. Run nrdk interactively in a container

   ```
   cd dev
   docker-compose run nrdk
   ```

2. Login to oc using an OpenShift [Web Console token](https://oauth-openshift.apps.silver.devops.gov.bc.ca/oauth/token/request).

   ```
   [container]$ oc login https://console.pathfinder.gov.bc.ca:8443 --token=<REDACTED>
   ```

3. Run nrdk (local build)

   ```
   [container]$ nrdk [COMMANDS] [-FLAGS]
   ```

### Stop

1. The container stops automatically when exited

   ```
   [container]$ exit
   ```
