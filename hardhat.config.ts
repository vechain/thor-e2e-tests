import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomiclabs/hardhat-truffle5'
import '@vechain/sdk-hardhat-plugin'
import 'hardhat-jest'
import { faucetAccountLength, faucetMnemonic } from './src/constants'

const config: HardhatUserConfig = {
    defaultNetwork: 'vechain',
    solidity: {
        compilers: [
            {
                version: '0.8.20',
            },
            {
                version: '0.8.24',
                settings: {
                    evmVersion: 'shanghai',
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    networks: {
        hardhat: {},
        vechain: {
            url: 'http://127.0.0.1:8669',
            accounts: {
                mnemonic: faucetMnemonic.join(' '),
                count: faucetAccountLength,
            },
            gas: 10_000_000,
        },
    },
}

export default config
