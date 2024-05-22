import { HardhatUserConfig } from 'hardhat/config'
import '@typechain/hardhat'
import '@nomicfoundation/hardhat-ethers'
import '@nomicfoundation/hardhat-chai-matchers'
import '@nomicfoundation/hardhat-toolbox'

const config: HardhatUserConfig = {
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
            {
                version: '0.5.16',
            },
        ],
    },
}

export default config
