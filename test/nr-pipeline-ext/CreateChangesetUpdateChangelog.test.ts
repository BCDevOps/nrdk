'use strict'
const expect = require('expect')
const moment = require('moment-timezone')
const Generator = require('../lib/CreateChangesetUpdateChangelog')
const generate = new Generator()
// const fs = require('fs')
// const sinon = require('sinon')

describe.skip('create Changeset', function () {
  this.timeout(50000)
  context('On running succesfully', function () {
    it('creates changeset', function () {
      const tDate = moment.tz(Date.now(), 'America/Vancouver').format('YYYYMMDDHHmmss')
      const str = '../migrations/testschema/sql/V' + tDate + '01__SAMPLE-123_create-table.sql'
      expect(generate.createChangeset('create-table', '../migrations/testschema/sql', 'SAMPLE-123', '01')).toBe(
        str,
      )
    })
  })
})

describe.skip('isDir', function () {
  this.timeout(50000)
  context('On running ', function () {
    it('returns true if directory exists, else false', function () {
      expect(generate.isDir('../migrations/testschema')).toBe(true)
    })
  })
})

describe.skip('isDir', function () {
  this.timeout(50000)
  context('On running ', function () {
    it('returns dalse if directory doesnt exist', function () {
      expect(generate.isDir('../migrations/test')).toBe(false)
    })
  })
})

describe.skip('update changelog', function () {
  this.timeout(50000)
  context('On running ', function () {
    it('updates a file', function () {
      expect(
        generate.updateChangelog(
          '../migrations/testschema/changelog/testschema.xml',
          ['create-table'],
          'test',
          '99881891991',
        ),
      ).toBe(true)
    })
  })
})

describe.skip('generate', function () {
  this.timeout(50000)
  context('On running ', function () {
    it('creates changeset and updates changelog', function () {
      expect(generate.execute('testschema', 'test', 'SAMPLE-123', 'create-table', '../migrations'))
    })
  })
})
