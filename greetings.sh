#!/bin/sh -l
set -euo nounset
#
# Test hello command

# Build and link
npm i -q
npm run build
[ -L /usr/local/bin/nrdk ] || npm link || sudo npm link

# Run commands
npx @bcgov/nrdk greetings
npx @bcgov/nrdk greetings argument
npx @bcgov/nrdk greetings -n flag

# Test
npm run mocha -- "test/commands/greetings.test.ts"

# Breakpoints
node --inspect ./bin/run greetings debug
