const { spawn } = require('child_process')
const commander = require('commander')

commander
    .usage('[OPTIONS]...')
    .option('--nodeURL <value>', 'Custom node url')
    .option('--pks <private keys>', 'A list of private keys, comma separated')
    .option('--mnemonic <mnemonic>', 'mnemonic')
    .option('--test <testname>', 'test')
    .option(
        '--networkType < main | testnet | solo | default-private >',
        'type of the network. Default: default-private',
    )
    .parse(process.argv)

const options = commander.opts()

var process_env = {}
if (options.nodeURL) {
    process_env.NODE_URLS = options.nodeURL
} else {
    throw new Error('--nodeURL flag is expected')
}
if (options.pks) {
    process_env.PRIVATE_KEYS = options.pks
}
if (options.mnemonic) {
    process_env.MNEMONIC = options.mnemonic
}
if (options.networkType) {
    process_env.NETWORK_TYPE = options.networkType
} else {
    process_env.NETWORK_TYPE = 'default-private'
}

let arguments = []
if (options.test) {
    arguments = ['jest', '-t', "'" + options.test + "'"]
} else {
    arguments = ['jest']
}

spawn('yarn', arguments, {
    shell: true,
    env: process_env,
    stdio: 'inherit',
    detached: false,
})
