import { ThorWallet } from '../../src/wallet'
import { OpcodeTests__factory as Opcodes } from '../../typechain-types'
import { Contract } from '@vechain/sdk-network'
import { Node1Client } from '../../src/thor-client'
import {
    addAddressPadding,
    addUintPadding,
} from '../../src/utils/padding-utils'
import { ethers } from 'ethers'
import { TransactionUtils } from '@vechain/sdk-core'
import exp from 'node:constants'

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
    let deploymentTarget: string
    const caller = '0xf077b491b355e64048ce21e3a6fc4751eeea77fa'
    const paddedCaller = addAddressPadding(caller) //remove 0x
        .slice(2)

    beforeAll(async () => {
        wallet = ThorWallet.new(true)
        opcodes = await wallet.deployContract(Opcodes.bytecode, Opcodes.abi)

        const targetPrefix = (await Node1Client.getDebugTargetPrefix(
            opcodes.deployTransactionReceipt?.meta.txID as string,
        )) as string

        deploymentTarget = `${targetPrefix}/0`
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
        // TODO: This test is failing, need to investigate
        // CODECOPY: {
        //     input: [10n, 10n, 10n],
        //     expected:
        //         '0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000a021a5760003560e01c8000000000000000000000000000000000000000000000',
        // },
        // BigNumber(2).pow(0) <= value <= BigNumber(2).pow(8) - 1
        PUSH1: {
            input: [BigInt(2) ^ BigInt(4)],
            expected: addUintPadding(BigInt(2) ^ BigInt(4)),
        },
        // BigNumber(2).pow(8) <= value <= BigNumber(2).pow(16) - 1
        PUSH2: {
            input: [BigInt(2) ^ BigInt(12)],
            expected: addUintPadding(BigInt(2) ^ BigInt(12)),
        },
        // BigNumber(2).pow(16) <= value <= BigNumber(2).pow(24) - 1
        PUSH3: {
            input: [BigInt(2) ^ BigInt(20)],
            expected: addUintPadding(BigInt(2) ^ BigInt(20)),
        },
        // BigNumber(2).pow(24) <= value <= BigNumber(2).pow(32) - 1
        PUSH4: {
            input: [BigInt(2) ^ BigInt(28)],
            expected: addUintPadding(BigInt(2) ^ BigInt(28)),
        },
        // BigNumber(2).pow(32) <= value <= BigNumber(2).pow(40) - 1
        PUSH5: {
            input: [BigInt(2) ^ BigInt(36)],
            expected: addUintPadding(BigInt(2) ^ BigInt(36)),
        },
        // BigNumber(2).pow(40) <= value <= BigNumber(2).pow(48) - 1
        PUSH6: {
            input: [BigInt(2) ^ BigInt(44)],
            expected: addUintPadding(BigInt(2) ^ BigInt(44)),
        },
        // BigNumber(2).pow(48) <= value <= BigNumber(2).pow(56) - 1
        PUSH7: {
            input: [BigInt(2) ^ BigInt(52)],
            expected: addUintPadding(BigInt(2) ^ BigInt(52)),
        },
        // BigNumber(2).pow(56) <= value <= BigNumber(2).pow(64) - 1
        PUSH8: {
            input: [BigInt(2) ^ BigInt(60)],
            expected: addUintPadding(BigInt(2) ^ BigInt(60)),
        },
        // BigNumber(2).pow(64) <= value <= BigNumber(2).pow(72) - 1
        PUSH9: {
            input: [BigInt(2) ^ BigInt(68)],
            expected: addUintPadding(BigInt(2) ^ BigInt(68)),
        },
        // BigNumber(2).pow(72) <= value <= BigNumber(2).pow(80) - 1
        PUSH10: {
            input: [BigInt(2) ^ BigInt(76)],
            expected: addUintPadding(BigInt(2) ^ BigInt(76)),
        },
        // BigNumber(2).pow(80) <= value <= BigNumber(2).pow(88) - 1
        PUSH11: {
            input: [BigInt(2) ^ BigInt(84)],
            expected: addUintPadding(BigInt(2) ^ BigInt(84)),
        },
        // BigNumber(2).pow(88) <= value <= BigNumber(2).pow(96) - 1
        PUSH12: {
            input: [BigInt(2) ^ BigInt(92)],
            expected: addUintPadding(BigInt(2) ^ BigInt(92)),
        },
        // BigNumber(2).pow(96) <= value <= BigNumber(2).pow(104) - 1
        PUSH13: {
            input: [BigInt(2) ^ BigInt(100)],
            expected: addUintPadding(BigInt(2) ^ BigInt(100)),
        },
        // BigNumber(2).pow(104) <= value <= BigNumber(2).pow(112) - 1
        PUSH14: {
            input: [BigInt(2) ^ BigInt(108)],
            expected: addUintPadding(BigInt(2) ^ BigInt(108)),
        },
        // BigNumber(2).pow(112) <= value <= BigNumber(2).pow(120) - 1
        PUSH15: {
            input: [BigInt(2) ^ BigInt(116)],
            expected: addUintPadding(BigInt(2) ^ BigInt(116)),
        },
        // BigNumber(2).pow(120) <= value <= BigNumber(2).pow(128) - 1
        PUSH16: {
            input: [BigInt(2) ^ BigInt(124)],
            expected: addUintPadding(BigInt(2) ^ BigInt(124)),
        },
        // BigNumber(2).pow(128) <= value <= BigNumber(2).pow(136) - 1
        PUSH17: {
            input: [BigInt(2) ^ BigInt(132)],
            expected: addUintPadding(BigInt(2) ^ BigInt(132)),
        },
        // BigNumber(2).pow(136) <= value <= BigNumber(2).pow(144) - 1
        PUSH18: {
            input: [BigInt(2) ^ BigInt(140)],
            expected: addUintPadding(BigInt(2) ^ BigInt(140)),
        },
        // BigNumber(2).pow(144) <= value <= BigNumber(2).pow(152) - 1
        PUSH19: {
            input: [BigInt(2) ^ BigInt(148)],
            expected: addUintPadding(BigInt(2) ^ BigInt(148)),
        },
        // BigNumber(2).pow(152) <= value <= BigNumber(2).pow(160) - 1
        PUSH20: {
            input: [BigInt(2) ^ BigInt(156)],
            expected: addUintPadding(BigInt(2) ^ BigInt(156)),
        },
        // BigNumber(2).pow(160) <= value <= BigNumber(2).pow(168) - 1
        PUSH21: {
            input: [BigInt(2) ^ BigInt(164)],
            expected: addUintPadding(BigInt(2) ^ BigInt(164)),
        },
        // BigNumber(2).pow(168) <= value <= BigNumber(2).pow(176) - 1
        PUSH22: {
            input: [BigInt(2) ^ BigInt(172)],
            expected: addUintPadding(BigInt(2) ^ BigInt(172)),
        },
        // BigNumber(2).pow(176) <= value <= BigNumber(2).pow(184) - 1
        PUSH23: {
            input: [BigInt(2) ^ BigInt(180)],
            expected: addUintPadding(BigInt(2) ^ BigInt(180)),
        },
        // BigNumber(2).pow(184) <= value <= BigNumber(2).pow(192) - 1
        PUSH24: {
            input: [BigInt(2) ^ BigInt(188)],
            expected: addUintPadding(BigInt(2) ^ BigInt(188)),
        },
        // BigNumber(2).pow(192) <= value <= BigNumber(2).pow(200) - 1
        PUSH25: {
            input: [BigInt(2) ^ BigInt(196)],
            expected: addUintPadding(BigInt(2) ^ BigInt(196)),
        },
        // BigNumber(2).pow(200) <= value <= BigNumber(2).pow(208) - 1
        PUSH26: {
            input: [BigInt(2) ^ BigInt(204)],
            expected: addUintPadding(BigInt(2) ^ BigInt(204)),
        },
        // BigNumber(2).pow(208) <= value <= BigNumber(2).pow(216) - 1
        PUSH27: {
            input: [BigInt(2) ^ BigInt(212)],
            expected: addUintPadding(BigInt(2) ^ BigInt(212)),
        },
        // BigNumber(2).pow(216) <= value <= BigNumber(2).pow(224) - 1
        PUSH28: {
            input: [BigInt(2) ^ BigInt(220)],
            expected: addUintPadding(BigInt(2) ^ BigInt(220)),
        },
        // BigNumber(2).pow(224) <= value <= BigNumber(2).pow(232) - 1
        PUSH29: {
            input: [BigInt(2) ^ BigInt(228)],
            expected: addUintPadding(BigInt(2) ^ BigInt(228)),
        },
        // BigNumber(2).pow(232) <= value <= BigNumber(2).pow(240) - 1
        PUSH30: {
            input: [BigInt(2) ^ BigInt(236)],
            expected: addUintPadding(BigInt(2) ^ BigInt(236)),
        },
        // BigNumber(2).pow(240) <= value <= BigNumber(2).pow(248) - 1
        PUSH31: {
            input: [BigInt(2) ^ BigInt(244)],
            expected: addUintPadding(BigInt(2) ^ BigInt(244)),
        },
        // BigNumber(2).pow(248) <= value <= BigNumber(2).pow(256) - 1
        PUSH32: {
            // input: [BigInt(2) ^ BigInt(249)],
            input: [],
            expected:
                'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
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

        const balance = BigInt(`0x${debugged.returnValue}`)

        expect(
            debugged.body.structLogs.some((log: any) => log.op === 'BALANCE'),
        ).toEqual(true)
        expect(balance).toBeGreaterThan(0)
    })

    /**
     * DUP_N
     */
    it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])(
        'should give the correct output for opcode: DUP%s',
        async (dupN) => {
            const debugged = await traceContractCall(
                opcodesInterface.encodeFunctionData('DUP_ALL', []),
                'DUP_ALL',
            )

            const relevantStructLogs = debugged.structLogs.filter(
                (log: any) => log.op === `DUP${dupN}`,
            )

            expect(relevantStructLogs.length).toBeGreaterThan(0)
        },
    )
})
