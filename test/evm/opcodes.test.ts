import { ThorWallet } from '../../src/wallet'
import { OpcodeTests__factory as Opcodes } from '../../typechain-types'
import { Contract } from '@vechain/sdk-network'
import { Node1Client } from '../../src/thor-client'
import {
    addAddressPadding,
    addUintPadding,
} from '../../src/utils/padding-utils'
import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import { Transaction } from '@vechain/sdk-core'
import { TransactionUtils } from '@vechain/sdk-core/src/utils'

const opcodesInterface = Opcodes.createInterface()

const zeroPadValue = (value: string) => ethers.zeroPadValue(value, 32).slice(2)

/**
 * TODO: Missed Opcodes:
 * - STOP
 * - ADDRESS
 */

describe('EVM Opcodes', () => {
    let wallet: ThorWallet
    let opcodes: Contract
    const caller = '0xf077b491b355e64048ce21e3a6fc4751eeea77fa'
    const paddedCaller = addAddressPadding(caller) //remove 0x
        .slice(2)

    beforeAll(async () => {
        wallet = ThorWallet.new(true)
        opcodes = await wallet.deployContract(Opcodes.bytecode, Opcodes.abi)
    })

    const traceContractCall = async (data: string, name: string) => {
        const clause = {
            to: opcodes.address,
            value: '0x1',
            data,
        }

        const debugged = await Node1Client.traceContractCall({
            ...clause,
            caller,
            gas: TransactionUtils.intrinsicGas([clause]),
        })

        expect(debugged.httpCode).toBe(200)
        expect(debugged.body).toBeDefined()
        expect(debugged.body.failed, `Trace should succeed for ${name}`).toBe(
            false,
        )

        return debugged.body
    }

    const simulateContractCall = async (data: string) => {
        const simulated = await Node1Client.executeAccountBatch({
            clauses: [
                {
                    to: opcodes.address,
                    value: '0x1',
                    data,
                },
            ],
            caller,
        })

        expect(simulated.httpCode).toBe(200)
        expect(simulated.body).toBeDefined()

        return simulated.body
    }

    const reusableTests = {
        ADD: { input: [10n, 20n], expected: addUintPadding(30n) },
        MUL: { input: [10n, 20n], expected: addUintPadding(200n) },
        SUB: { input: [10000n, 10n], expected: addUintPadding(9990n) },
        DIV: { input: [10000n, 20n], expected: addUintPadding(500n) },
        SDIV: { input: [1000n, 20n], expected: addUintPadding(50n) },
        MOD: { input: [99n, 10n], expected: addUintPadding(9n) },
        SMOD: { input: [99n, 10n], expected: addUintPadding(9n) },
        ADDMOD: { input: [99n, 10n, 20n], expected: addUintPadding(9n) },
        MULMOD: { input: [10n, 2n, 19n], expected: addUintPadding(1n) },
        EXP: { input: [2n, 3n], expected: addUintPadding(8n) },
        SIGNEXTEND: { input: [], expected: addUintPadding(128n) },
        LT: { input: [10n, 20n], expected: addUintPadding(1n) },
        GT: { input: [10n, 20n], expected: addUintPadding(0n) },
        SLT: { input: [10n, 20n], expected: addUintPadding(1n) },
        SGT: { input: [10n, 20n], expected: addUintPadding(0n) },
        EQ: { input: [10n, 20n], expected: addUintPadding(0n) },
        ISZERO: { input: [0n], expected: addUintPadding(1n) },
        AND: { input: [10n, 20n], expected: addUintPadding(0n) },
        OR: { input: [10n, 20n], expected: addUintPadding(30n) },
        XOR: { input: [10n, 20n], expected: addUintPadding(30n) },
        NOT: {
            input: [
                '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFA',
            ],
            expected: addUintPadding(5n),
        },
        BYTE: { input: [4n, 8n], expected: addUintPadding(0n) },
        // Expected result: 12340987912341234 << 2
        SHL: {
            input: [12340987912341234n, 2n],
            expected: addUintPadding(49363951649364936n),
        },
        // Expected result: 12340987912341234 >> 2
        SHR: {
            input: [12340987912341234n, 2n],
            expected: addUintPadding(3085246978085308),
        },
        SAR: {
            input: [12340987912341234n, 2n],
            expected: addUintPadding(3085246978085308),
        },
        SHA3: {
            input: ['0x68656c6c6f20776f726c64'],
            expected:
                '47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad',
        },
        ORIGIN: { input: [], expected: paddedCaller },
        CALLER: { input: [], expected: paddedCaller },
        CALLVALUE: { input: [], expected: addUintPadding(1n) },
        CALLDATALOAD: {
            input: [10n],
            expected: addUintPadding(2814749767106560),
        },
        CALLDATASIZE: { input: [], expected: addUintPadding(4n) },
        CALLDATACOPY: {
            input: [10n, 10n, 10n],
            expected:
                '0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000',
        },
        // TODO: Enable this test when all tests are complete
        // CODESIZE: { input: [], expected: zeroPadValue('0x1082') },
        CODECOPY: {
            input: [10n, 10n, 10n],
            expected:
                '0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000a021a5760003560e01c8000000000000000000000000000000000000000000000',
        },
    }

    it.each(Object.entries(reusableTests))(
        'should give the correct output for opcode:  %s',
        async (name, { input, expected }) => {
            const debugged = await traceContractCall(
                opcodesInterface.encodeFunctionData(name as any, input as any),
                name,
            )

            expect(
                debugged.structLogs.some((log: any) => log.op === name),
            ).toEqual(true)
            expect(debugged.returnValue).toBe(expected)
        },
    )

    it('should give the correct output for opcode: BALANCE', async () => {
        const debugged = await traceContractCall(
            opcodesInterface.encodeFunctionData('BALANCE', [caller]),
            'BALANCE',
        )

        const balance = BigNumber(debugged.returnValue, 16)

        expect(
            debugged.body.structLogs.some((log: any) => log.op === 'BALANCE'),
        ).toEqual(true)
        expect(balance.toNumber()).toBeGreaterThan(0)
    })
})
