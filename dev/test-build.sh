#!/bin/sh -l
set -euo nounset

NAME=nrdk-dev
docker build -t "${NAME}" .
docker run --rm "${NAME}" --name ${NAME}
