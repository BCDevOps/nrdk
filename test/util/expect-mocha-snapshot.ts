/* eslint-disable func-names */
const jestSnapshot = require('jest-snapshot')

function makeTestTitle(test: any) {
  let next = test
  const title = []

  for (;;) {
    if (!next.parent) {
      break
    }

    title.push(next.title)
    next = next.parent
  }

  return title.reverse().join(' ')
}

export function toMatchSnapshot(received: any, mochaContext: any, name: any) {
  if (!mochaContext || !mochaContext.test) {
    throw new Error(
      'Missing `mochaContext` argument for .toMatchSnapshot().\n' +
                'Did you forget to pass `this` into expect().toMatchSnapshot(this)?'
    )
  }

  const {test} = mochaContext

  const snapshotState = new jestSnapshot.SnapshotState(`${test.file}.snap`, {
    updateSnapshot: process.env.SNAPSHOT_UPDATE ? 'all' : 'new',
  })

  const matcher = jestSnapshot.toMatchSnapshot.bind({
    snapshotState,
    currentTestName: makeTestTitle(test),
  })

  const result = matcher(received, name)
  snapshotState.save()

  return result
}
