#!/bin/bash
#%
#% Development watcher for oclif commands
#%
#%   Runs commands on save.  Provide a command name with flags and/or arguments
#%
#%   USAGE
#%     $ ${THIS_FILE} [COMMAND] [flags] [args]
#%
#%   COMMANDS
#%     name of command being developed
#%   
#%   EXAMPLE
#%     ${THIS_FILE} tool:terraform -version
#%

# Specify halt conditions (errors, unsets, non-zero pipes), field separator and verbosity
#
set -euo pipefail
IFS=$'\n\t'
[ ! "${VERBOSE:-}" == "true" ] || set -x

# Base conditions
#
SCRIPT_DIR="$(dirname ${0})"

# Receive parameters as one variable
#
COMMANDS="${@}"

# If no parameters have been passed show the help header from this script
#
[ "${#}" -gt 0 ] || {
	THIS_FILE="${SCRIPT_DIR}/$(basename ${0})"

	# Cat this file, grep #% lines and clean up with sed
	cat ${THIS_FILE} |
		grep "^#%" |
		sed -e "s|^#%||g" |
		sed -e "s|\${THIS_FILE}|${THIS_FILE}|g"
	exit
}

# Verify tsc-watch is installed
#
if (! which tsc-watch)
then
	echo -e "\n Install tsc-watch globally to use this tool.  E.g.:"
	echo -e "   $ npm i -g tsc-watch"
	exit
fi

# Run command on save using tsc-watch
#
tsc-watch --onSuccess "${SCRIPT_DIR}/../bin/run ${COMMANDS}"
