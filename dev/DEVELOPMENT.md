# Publishing
```
npm run publish:latest
```
## Known Problems
* Adding `@types/rsync` as bundleDependencies will cause installation errors:
    > Error: EPERM: operation not permitted, rename '...' -> '...'

# Standalone Environment
1. Start a container
```
docker run -it --rm --entrypoint bash centos:7
```
2. Install required tools
From the container terminal previously started, run:
```
yum install -y git
curl https://mirror.openshift.com/pub/openshift-v3/clients/3.11.286/linux/oc.tar.gz | tar zxf - -C /usr/local/bin
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.0/install.sh | bash
source /root/.bashrc
nvm install v12 --lts
cd /tmp
git clone https://github.com/BCDevOps/nrdk.git
cd /tmp/nrdk
git checkout feature/ONETEAM-429
npm install
npm run build
npm link
cd /tmp
npx @bcgov/nrdk version
```

2.1 Login to Openshift using `oc`
Open the OpenShift Web Console and copy the login command. e.g.:
```
oc login ...
```

3. Install nrdk
```
npm i -g @bcgov/nrdk # or `npm link` from the checked out source code
npx @bcgov/nrdk version
```

4. Prepare Build/Deployment environment
```
export CHANGE_ID=15
```

5. Run build
```
npx @bcgov/nrdk build --archetype=java-web-app --pr=${CHANGE_ID}
```