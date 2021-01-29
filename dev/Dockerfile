FROM centos:7

RUN yum install -y git
RUN curl https://mirror.openshift.com/pub/openshift-v3/clients/3.11.286/linux/oc.tar.gz | tar zxf - -C /usr/local/bin
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.0/install.sh | bash
RUN source /root/.bashrc && \
    nvm install v12 --lts

WORKDIR /app
RUN git clone https://github.com/BCDevOps/nrdk.git .
RUN source /root/.bashrc && \
    npm install && \
    npm run build && \
    npm link

ENV NVM_DIR="$HOME/.nvm"
ENV PATH="/root/.nvm/versions/node/v12.20.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ENTRYPOINT npx @bcgov/nrdk version
