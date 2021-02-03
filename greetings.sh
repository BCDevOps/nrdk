#!/bin/sh -l
set -euo nounset
#
# Test hello command

# Link/symlink
[ -f /usr/local/bin/nrdk ] || sudo npm link

# Run watcher in background
docker-compose up -d watcher

# Wait (yes, I know this is daft)
sleep 20

# Run commands
npx @bcgov/nrdk greetings
npx @bcgov/nrdk greetings Earth
npx @bcgov/nrdk greetings -n Earth

# Test
npm run mocha -- "test/commands/greetings.test.ts"

# Breakpoints
node --inspect @bcgov/nrdk greetings Earth

# Stop container
docker-compose down
