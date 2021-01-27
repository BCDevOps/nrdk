FROM python:3.9.1-buster
ARG ANSIBLE_VERSION=2.10.5
RUN python3 -m pip install --no-cache-dir virtualenv && \
    python3 -m virtualenv /opt/ansible && \
    /opt/ansible/bin/python3 -m pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /opt/ansible/bin/python3 -m pip install --no-cache-dir "ansible==${ANSIBLE_VERSION}"
WORKDIR /home/app
ENV VIRTUAL_ENV='/opt/ansible' PATH=/opt/ansible/bin:${PATH} HOME=/home/app