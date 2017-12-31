import Augur from 'augur.js'
import logError from 'utils/log-error'

export const connect = (env, callback = logError) => {
  const connectOptions = {
    augurNode: env['augur-node'],
    ethereumNode: env['ethereum-node'],
    networkID: env['network-id'],
  }
  if (env.debug) augur.rpc.setDebugOptions(env.debug)
  augur.connect(connectOptions, (err, connectionInfo) => {
    if (err) return callback(err)
    console.log('connected:', connectionInfo)
    callback(null, connectionInfo.ethereumNode)
  })
}

export const augur = new Augur()
export const { constants } = augur
