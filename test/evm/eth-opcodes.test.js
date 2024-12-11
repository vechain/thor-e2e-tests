// Copyright 2019 The go-ethereum Authors
// This file is part of the go-ethereum library.
//
// The go-ethereum library is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// The go-ethereum library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with the go-ethereum library. If not, see <http://www.gnu.org/licenses/>.

import { ThorWallet } from '../../src/wallet'
import { OpCodes__factory as Opcodes } from '../../typechain-types'
import { pollReceipt } from '../../src/transactions'

/**
 * @notice - Copied from: https://github.com/ethereum/go-ethereum/blob/master/tests/solidity/test/opCodes.js
 */

/**
 * @group evm
 * @group opcodes
 */
describe('EVM Opcodes', () => {
    let wallet
    let opcodes

    beforeAll(async () => {
        wallet = ThorWallet.withFunds()
        opcodes = await wallet.deployContract(Opcodes.bytecode, Opcodes.abi)
    })

    it.e2eTest(
        'should run without errors the majority of opcodes',
        'all',
        async () => {
            await opcodes.transact.test()
            await opcodes.transact.test_stop()
        },
    )

    it.e2eTest('should throw invalid op code', 'all', async () => {
        await expect(() => opcodes.transact.test_invalid()).rejects.toThrow()
    })

    it.e2eTest('should revert', 'all', async () => {
        const { wait, id } = await opcodes.transact.test_revert()

        await pollReceipt(id)
        const tx = await wait()

        expect(tx?.reverted).toBeTrue()
    })
})
