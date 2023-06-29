
module.exports = async function session(ds, target, program, comPort) {
  let cores
  try {
    const data = await ds.configure(target)
    cores = data.cores
  } catch(err) {
    console.error('Unable to configure target: ' + err.message)
    return false
  }
  console.log('cores', cores)
  const core = await ds.createSubModule(cores[0])

  await core.cio.willHandleInput(true)
  await core.targetState.connect()
  await core.settings.set({
    AutoRunToLabelName: "main"
  })
  await core.targetState.getResets()
  try {
    await core.symbols.loadProgram(program)
  } catch(err) {
    console.error('Failed to load program. (Wrong MCU model?) '+err.message)
    return false
  }

  await core.waitForEvent({
    good: ({data, event}) => event == 'targetState.changed' && data.description == 'Suspended - H/W Breakpoint',
    timeout: 6 * 1000,
  }).catch(err=>{
    console.error('device did not enter expected target state')
    throw err
  })
  console.log('SUSPENDED')

  const stack = await core.callstack.fetch()
  console.log(stack.frames[0])

  if (comPort) serial(comPort)
  core.targetState.run()
  await core.waitForEvent({
    good: ({data, event}) => event == 'targetState.changed' && data.description == 'Running',
    timeout: 6 * 1000,
  })
  console.log('Target is running')
  return true
}

function serial(path) {
  const { SerialPort, ReadlineParser } = require('serialport')
  const baudRate = 115200
  const port = new SerialPort({ path, baudRate })
  port.pipe(process.stdout)
  setTimeout(()=>{
    port.write('ROBOT PLEASE RESPOND\n')
  }, 200)
}
