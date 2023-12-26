import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import '@nomiclabs/hardhat-truffle5';
import '@vechain/hardhat-vechain'
import '@vechain/hardhat-ethers'

// use mocha config from .mocharc.json so we have common config between hardhat and mocha
const mochaConfig = require('./.mocharc.json')
delete mochaConfig.require

const config: HardhatUserConfig = {
  defaultNetwork: "vechain",
  solidity: "0.8.19",
  mocha: mochaConfig,
  networks: {
    hardhat: {},
    vechain: {
      url: "http://127.0.0.1:8669",
      accounts: {
        mnemonic: "denial kitchen pet squirrel other broom bar gas better priority spoil cross",
        count: 100,
      },
      gas: 10000000
    }
  }
};

export default config;
