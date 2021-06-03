'use strict'
const Initializer = require('../lib/InitializeJavaAppClass')
const expect = require('expect')
const initializerObj = new Initializer()
const fs = require('fs')
const {spawnSync} = require('child_process')
// const path = require('path')
// const { childProcess } = require('./util-functions')

describe.skip('initialize module', function () {
  this.timeout(50000)
  context('On calling initialize', function () {
    it('ear folder is not present', async function () {
      spawnSync('rm', ['-rf', '../ear'])
      expect(await initializerObj.__isDir('../ear')).toBe(false)
    })
  })

  context('On calling initialize', function () {
    it('ear folder is present', async function () {
      fs.mkdirSync('../ear')
      expect(await initializerObj.__isDir('../ear')).toBe(true)
    })
  })

  context('On calling initialize', function () {
    it('ear folder is created', async function () {
      spawnSync('rm', ['-rf', '../ear'])
      spawnSync('rm', ['-rf', '.pipeline'])
      fs.mkdirSync('../src')
      fs.mkdirSync('.pipeline')
      fs.mkdirSync('.pipeline/node_modules')
      fs.mkdirSync('.pipeline/node_modules/nr-pipeline-ext')
      fs.mkdirSync('.pipeline/node_modules/nr-pipeline-ext/lib')
      fs.mkdirSync('.pipeline/node_modules/nr-pipeline-ext/lib/templates')
      fs.mkdirSync('.pipeline/node_modules/nr-pipeline-ext/lib/templates/.pipeline')
      await initializerObj.initialize()
      expect(await initializerObj.__isDir('../ear/src')).toBe(true)
      spawnSync('rm', ['-rf', '.pipeline', '../ear', '../src'])
    })
  })

  context('On calling initialize', function () {
    it('src folder is not present', function () {
      spawnSync('rm', ['-rf', '../src'])
      spawnSync('rm', ['-rf', '../ear'])
      spawnSync('rm', ['-rf', '.pipeline'])
      expect(async () => initializerObj.initialize()).toThrow()
      spawnSync('rm', ['-rf', '.pipeline'])
    })
  })

  context('On calling initialize', function () {
    it('.pipeline folder is synced', async function () {
      spawnSync('rm', ['-rf', '.pipeline'])
      fs.mkdirSync('.pipeline')
      fs.mkdirSync('.pipeline/node_modules')
      fs.mkdirSync('.pipeline/node_modules/nr-pipeline-ext')
      fs.mkdirSync('.pipeline/node_modules/nr-pipeline-ext/lib')
      fs.mkdirSync('.pipeline/node_modules/nr-pipeline-ext/lib/templates')
      fs.mkdirSync('.pipeline/node_modules/nr-pipeline-ext/lib/templates/.pipeline')
      await initializerObj.__initializePipelineFolder()
      expect(initializerObj.__isDir('.pipeline')).toBe(true)
      spawnSync('rm', ['-rf', '.pipeline'])
    })
  })
})
