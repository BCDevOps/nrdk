const fs = require('fs')
const convert = require('xml-js')
const xml = fs.readFileSync(`${process.argv[2]}`, 'utf8')
// const xml = require('fs').readFileSync('lib/assets/RFD-Workflow-V1.2.xml', 'utf8')
const options = {compact: true, ignoreComment: true, alwaysArray: true}
const result = convert.xml2js(xml, options) // or convert.xml2json(xml, options)

const STEPS = new Map()
const GLOBAL_ACTIONS = new Map()
// const LOCAL_ACTIONS = new Map()
const COMMON_ACTIONS = new Map()

// index all steps by @id
for (const step of result.workflow[0].steps[0].step) {
  STEPS.set(step._attributes.id, Object.assign({'jira.status.id': step.meta[0]._text[0]}, step._attributes))
}

for (const action of result.workflow[0]['global-actions'][0].action) {
  const targetStepId = action.results[0]['unconditional-result'][0]._attributes.step
  GLOBAL_ACTIONS.set(action._attributes.id, Object.assign({targetStep: targetStepId}, action._attributes))
}
if (result.workflow[0]['common-actions'] && result.workflow[0]['common-actions'].length > 0) {
  for (const action of result.workflow[0]['common-actions'][0].action) {
    const targetStepId = action.results[0]['unconditional-result'][0]._attributes.step
    COMMON_ACTIONS.set(action._attributes.id, Object.assign({targetStep: targetStepId}, action._attributes))
  }
}

const INITIAL_STEP = STEPS.get(
  result.workflow[0]['initial-actions'][0].action[0].results[0]['unconditional-result'][0]._attributes.step
)
// console.dir(INITIAL_STEP)
// process.exit()

// collect all possible action for each status
for (const step of result.workflow[0].steps[0].step) {
  const stepRef = STEPS.get(step._attributes.id)
  stepRef.actions = stepRef.actions || []
  // const fromStatusId = console.dir(step.meta[0]._text[0])
  // STEPS.set(step._attributes.id, step._attributes)
  // step.meta._attributes.
  if (step.actions && step.actions.length > 0) {
    if (step.actions[0].action) {
      for (const action of step.actions[0].action) {
        const targetStepId = action.results[0]['unconditional-result'][0]._attributes.step
        stepRef.actions.push(
          Object.assign({targetStep: targetStepId, targetStepId, type: 'local'}, action._attributes)
        )
      }
    }
    if (step.actions[0]['common-action']) {
      for (const actionRef of step.actions[0]['common-action']) {
        const commonAction = COMMON_ACTIONS.get(actionRef._attributes.id)
        stepRef.actions.push(
          Object.assign({targetStep: commonAction.targetStep, type: 'common'}, commonAction)
        )
      }
    }
  }
  for (const globalAction of GLOBAL_ACTIONS.values()) {
    stepRef.actions.push(Object.assign({targetStep: globalAction.targetStep, type: 'global'}, globalAction))
  }
}

function cname(string) {
  return string
  .toUpperCase()
  .replace(/ /g, '_')
  .replace(/-/g, '_')
  .replace(/[_]+/g, '_')
}

function acname(statusName) {
  return `ACTION_${cname(statusName)}`
}

function scname(statusName) {
  return `STATUS_${cname(statusName)}`
}

const outputFile = `${process.argv[3]}`
fs.appendFileSync(outputFile, '/* eslint-disable prettier/prettier */\n', {flag: 'w'})
fs.appendFileSync(outputFile, "'use strict'\n", {flag: 'a'})

fs.appendFileSync(outputFile, '\n', {flag: 'a'})
for (const step of STEPS.values()) {
  fs.appendFileSync(
    outputFile,
    `export const ${scname(step.name)} = {id: '${step['jira.status.id']}', name: '${step.name}'}\n`,
    {
      flag: 'a',
    }
  )
}

fs.appendFileSync(outputFile, '\n', {flag: 'a'})
for (const action of [...GLOBAL_ACTIONS.values(), ...COMMON_ACTIONS.values()]) {
  const targetStepRef = STEPS.get(action.targetStep)
  fs.appendFileSync(
    outputFile,
    `export const ${acname(action.id)} = {name: '${action.name}', id: '${action.id}', to: {...${scname(
      targetStepRef.name
    )}}}\n`,
    {
      flag: 'a',
    }
  )
  fs.appendFileSync(outputFile, `export const ${acname(action.name)} = ${acname(action.id)}\n`, {flag: 'a'})
}
for (const step of STEPS.values()) {
  for (const action of step.actions) {
    if (action.type === 'local') {
      const targetStepRef = STEPS.get(action.targetStep)
      fs.appendFileSync(
        outputFile,
        `export const ${acname(action.id)} = {name: '${action.name}', id: '${action.id}', to: {...${scname(
          targetStepRef.name
        )}}}\n`,
        {
          flag: 'a',
        }
      )
      if (action.name.toUpperCase() !== 'REQUEST INFO') {
        fs.appendFileSync(outputFile, `export const ${acname(action.name)} = ${acname(action.id)}\n`, {flag: 'a'})
      }
    }
  }
}
fs.appendFileSync(outputFile, '\n', {flag: 'a'})
fs.appendFileSync(outputFile, 'const ACTIONS = {\n', {flag: 'a'})
for (const step of STEPS.values()) {
  for (const action of step.actions) {
    if (action.type === 'local') {
      fs.appendFileSync(outputFile, `  [${acname(action.id)}.id]: ${acname(action.id)},\n`, {
        flag: 'a',
      })
    }
  }
}
for (const action of [...GLOBAL_ACTIONS.values(), ...COMMON_ACTIONS.values()]) {
  fs.appendFileSync(outputFile, `  [${acname(action.id)}.id]: ${acname(action.id)},\n`, {
    flag: 'a',
  })
}
fs.appendFileSync(outputFile, '}\n', {flag: 'a'})
fs.appendFileSync(outputFile, 'const WORKFLOW = {\n', {flag: 'a'})
for (const step of STEPS.values()) {
  fs.appendFileSync(outputFile, `  [${scname(step.name)}.id]: [\n`, {flag: 'a'})
  for (const action of step.actions) {
    try {
      fs.appendFileSync(outputFile, `    ${acname(action.id)}, // ${action.name}\n`, {flag: 'a'})
    } catch (error) {
      throw error
    }
  }
  fs.appendFileSync(outputFile, '  ],\n', {flag: 'a'})
}
fs.appendFileSync(outputFile, '}\n', {flag: 'a'})
fs.appendFileSync(outputFile, '\n', {flag: 'a'})
fs.appendFileSync(outputFile, 'export default class RfdWorkflow {\n', {flag: 'a'})
// fs.appendFileSync(outputFile, '\n', {flag: 'a'})
for (const action of [...GLOBAL_ACTIONS.values(), ...COMMON_ACTIONS.values()]) {
  fs.appendFileSync(outputFile, `    static ${acname(action.id)} = ${acname(action.id)}\n\n`, {
    flag: 'a',
  })
}
for (const step of STEPS.values()) {
  for (const action of step.actions) {
    if (action.type === 'local') {
      fs.appendFileSync(outputFile, `    static ${acname(action.id)} = ${acname(action.id)}\n\n`, {
        flag: 'a',
      })
    }
  }
}
// fs.appendFileSync(outputFile, '\n', {flag: 'a'})
for (const step of STEPS.values()) {
  fs.appendFileSync(outputFile, `    static ${scname(step.name)} = ${scname(step.name)}\n\n`, {
    flag: 'a',
  })
}
// fs.appendFileSync(outputFile, '\n', {flag: 'a'})
fs.appendFileSync(outputFile, '    static ALL_STATUS = [', {flag: 'a'})
for (const step of STEPS.values()) {
  fs.appendFileSync(outputFile, `\n      ${scname(step.name)},`, {
    flag: 'a',
  })
}
fs.appendFileSync(outputFile, '\n    ]\n', {flag: 'a'})
fs.appendFileSync(outputFile, '\n', {flag: 'a'})
fs.appendFileSync(outputFile, `    static INITIAL_STATUS = ${scname(INITIAL_STEP.name)}\n\n`, {flag: 'a'})
fs.appendFileSync(outputFile, '    static getTransitionsByStatusId(statusId: string) {\n', {flag: 'a'})
fs.appendFileSync(outputFile, '      return WORKFLOW[statusId]\n', {flag: 'a'})
fs.appendFileSync(outputFile, '    }\n\n', {flag: 'a'})
fs.appendFileSync(outputFile, '    static getTransitionById(transitionId: string) {\n', {flag: 'a'})
fs.appendFileSync(outputFile, '      return ACTIONS[transitionId]\n', {flag: 'a'})
fs.appendFileSync(outputFile, '    }\n', {flag: 'a'})
fs.appendFileSync(outputFile, '}\n', {flag: 'a'})
