#!/bin/sh -l
set -euo nounset
#
# Test hello command

# Build and link
npm i -q
npm run build
[ -L /usr/local/bin/nrdk ] || npm link || sudo npm link

# Run commands
time npx @bcgov/nrdk greetings
time npx @bcgov/nrdk greetings argument
time npx @bcgov/nrdk greetings -n flag

# Test
time npm run mocha -- "test/commands/greetings.test.ts"

# Breakpoints
node --inspect ./bin/run greetings debug
