import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

import '@nomiclabs/hardhat-truffle5'
import '@vechain/hardhat-vechain'
import '@vechain/hardhat-ethers'
import { faucetAccountLength, faucetMnemonic } from './src/constants'

const config: HardhatUserConfig = {
    defaultNetwork: 'vechain',
    solidity: '0.8.20',
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
