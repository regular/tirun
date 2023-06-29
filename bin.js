#!/usr/bin/env node
const {join, resolve} = require('path')
const proxyConfig = require('rc')('dslite-proxy')
const DSProxy = require('dslite-proxy')
const client = require('dslite-client')
const conf = require('rc')('tirun')
const session = require('./session')

const log = conf.verbose ?  console.log : ()=>{}

async function main() {
  // since rc is using process.argv,
  // we will have command line args
  // preent in botj, proxyConfig and conf
  proxyConfig._ = []

  if (conf._.length == 3) {
    let [ccxml, image, comPort] = conf._
    ccxml = resolve(process.cwd(), ccxml)
    image = resolve(process.cwd(), image)
    await run(ccxml, image, comPort)
  } else {
    usage()
    process.exit(1)
  }
}

async function run(ccxml, image, comPort) {
  const proxy = await startServer(proxyConfig, {log})
  const ds = await client(proxy.port, {log, promisify: true})
  const {version} = await ds.getVersion()
  console.log(`DSLite ${version}`)
  let success
  try {
    success = await session(ds, ccxml, image, conf.monitor ? comPort : null)
  } catch(err) {
    console.error(err.stack)
    success = false
  }
  if (!conf.monitor || !success) {
    ds.close()
    proxy.stop()
  }
  process.exitCode = success ? 0 : 1
}

main()

function usage() {
  console.log(`  tirun TARGET_CCXML FIRMWARE_IMAGE COMPORT
  tirun SERIALNUMBER FIRMWARE_IMAGE
`)
}

// -- util

function startServer(config, opts) {
  opts = opts || {}
  const log = opts.log || ( ()=>{} )
  return new Promise( (resolve, reject)=>{
    DSProxy(log, config, {}, (err, res)=>{
      if (err) return reject(err)
      resolve(res)
    })
  })
}

