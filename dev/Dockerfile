FROM centos:7

ENV PATH="/root/.nvm/versions/node/v12.20.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    OC_VER="3.11.286" \
    NPM_VER="0.37.0"

# Base - oc and npm
RUN yum install -y git && \
    curl https://mirror.openshift.com/pub/openshift-v3/clients/${OC_VER}/linux/oc.tar.gz | tar zxf - -C /usr/local/bin && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v${NPM_VER}/install.sh | bash && \
    source /root/.bashrc && \
    nvm install v12 --lts

ENTRYPOINT npx @bcgov/nrdk version
