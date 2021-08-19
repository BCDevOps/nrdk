FROM node:14-buster

ENV OC_VER="3.11.286"

# Base - git and oc
RUN apt install -y git && \
    curl https://mirror.openshift.com/pub/openshift-v3/clients/${OC_VER}/linux/oc.tar.gz | tar zxf - -C /usr/local/bin

# Convenience shortcut - target doesn't exist yet
RUN ln -s /app/bin/run /usr/local/bin/nrdk

# Entrypoint - version
ENTRYPOINT npx @bcgov/nrdk version
