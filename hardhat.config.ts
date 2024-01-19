import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

import '@nomiclabs/hardhat-truffle5'
import '@vechain/hardhat-vechain'
import '@vechain/hardhat-ethers'
import 'hardhat-jest'

const config: HardhatUserConfig = {
    defaultNetwork: 'vechain',
    solidity: '0.8.20',
    networks: {
        hardhat: {},
        vechain: {
            url: 'http://127.0.0.1:8669',
            accounts: {
                mnemonic:
                    'denial kitchen pet squirrel other broom bar gas better priority spoil cross',
                count: 100,
            },
            gas: 10000000,
        },
    },
}

export default config
