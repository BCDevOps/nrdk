#!/bin/sh -l
set -euo nounset
#
# Super simple wrapper for quick method steps in dev/README.md

# Build images
docker-compose build

# Start services (like docker-compose up), but open bash shell for nrdk
docker-compose run nrdk

# Stop services
docker-compose down
