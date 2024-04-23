import { ThorWallet } from '../../src/wallet'
import { Contract } from '@vechain/sdk-network'
import {
    IndividualOpCodes__factory as Opcodes,
    SimpleCounterShanghai__factory as ShanghaiCounter,
} from '../../typechain-types'
import { Node1Client } from '../../src/thor-client'
import {
    addAddressPadding,
    addUintPadding,
} from '../../src/utils/padding-utils'
import { pollReceipt } from '../../src/transactions'

const opcodesInterface = Opcodes.createInterface()

/**
 * TODO - Missing Tests:
 * - JUMP
 * - JUMPI
 * - PC
 * - JUMPDEST
 * - SWAP 1-16
 */

/**
 * @group opcodes
 * @group evm
 */
describe('Individual OpCodes', () => {
    let wallet: ThorWallet
    let opcodes: Contract
    const caller = '0xf077b491b355e64048ce21e3a6fc4751eeea77fa'
    const paddedCaller = addAddressPadding(caller) //remove 0x
        .slice(2)
    beforeAll(async () => {
        wallet = ThorWallet.new(true)
        opcodes = await wallet.deployContract(Opcodes.bytecode, Opcodes.abi)
    })

    const traceContractCall = async (
        data: string,
        name: string,
        isFailure = false,
    ) => {
        const clause = {
            to: opcodes.address,
            value: '0x1',
            data,
        }

        const debugged = await Node1Client.traceContractCall({
            ...clause,
            caller,
            gas: 1_000_000,
        })

        expect(debugged.httpCode).toBe(200)
        expect(debugged.body).toBeDefined()
        expect(debugged.body.failed, `Trace should succeed for ${name}`).toBe(
            isFailure,
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
        CODESIZE: {
            input: [],
            expected:
                '0000000000000000000000000000000000000000000000000000000000003b19',
        },
        CODECOPY: {
            input: [10n, 10n, 10n],
            expected:
                '0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000a06675760003560e01c8000000000000000000000000000000000000000000000',
        },
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
        CREATE: {
            input: [],
            expected: '',
        },
        CALL: {
            input: [],
            expected: '',
        },
        CALLCODE: {
            input: [],
            expected: '',
        },
        RETURN: {
            input: [11234n],
            expected: addUintPadding(11234n),
        },
        DELEGATECALL: {
            input: [],
            expected: '',
        },
        CREATE2: {
            input: [],
            expected: '',
        },
        STATICCALL: {
            input: [],
            expected: '',
        },
        SELFDESTRUCT: {
            input: [caller],
            expected: '',
        },
    }

    it.each(Object.entries(reusableTests))(
        'should give the correct output for opcode: %s',
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
            debugged.structLogs.some((log: any) => log.op === 'BALANCE'),
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
                opcodesInterface.encodeFunctionData('DUP_ALL'),
                `DUP${dupN}`,
            )

            const relevantStructLogs = debugged.structLogs.filter(
                (log: any) => log.op === `DUP${dupN}`,
            )

            expect(relevantStructLogs.length).toBeGreaterThan(0)
        },
    )

    const logTests = {
        LOG0: [1n, 3n],
        LOG1: [1n, 3n, 5n],
        LOG2: [1n, 3n, 5n, 7n],
        LOG3: [1n, 3n, 5n, 7n, 9n],
        LOG4: [1n, 3n, 5n, 7n, 9n, 11n],
    }

    it.each(Object.entries(logTests))(
        'should give the correct output for opcode: %s',
        async (logN, input) => {
            const debugged = await traceContractCall(
                opcodesInterface.encodeFunctionData(logN as any, input as any),
                logN,
            )

            const relevantStructLogs = debugged.structLogs.filter(
                (log: any) => log.op === logN,
            )

            expect(relevantStructLogs.length).toBeGreaterThan(0)

            const simulation = await simulateContractCall(
                opcodesInterface.encodeFunctionData(logN as any, input as any),
            )
            const relevantEvent = simulation?.[0]?.events?.[0]

            expect(relevantEvent).toBeDefined()
            expect(relevantEvent?.topics?.length).toBe(input.length - 2)
        },
    )

    it('should give the correct output for opcode: REVERT', async () => {
        const debugged = await traceContractCall(
            opcodesInterface.encodeFunctionData('REVERT'),
            'REVERT',
            true,
        )

        const relevantStructLogs = debugged.structLogs.filter(
            (log: any) => log.op === 'REVERT',
        )

        expect(relevantStructLogs.length).toBeGreaterThan(0)
    })

    it('should give the correct output for opcode: INVALID', async () => {
        const debugged = await traceContractCall(
            opcodesInterface.encodeFunctionData('INVALID'),
            'INVALID',
            true,
        )

        expect(debugged.structLogs[debugged.structLogs.length - 1].error).toBe(
            'invalid opcode 0xfe',
        )
    })

    it('should give the correct output for opcode: STOP', async () => {
        const debugged = await traceContractCall(
            opcodesInterface.encodeFunctionData('STOP'),
            'STOP',
        )

        expect(debugged.structLogs[debugged.structLogs.length - 1].op).toBe(
            'STOP',
        )
    })

    it('should give the correct output for opcode: ADDRESS', async () => {
        const debugged = await traceContractCall(
            opcodesInterface.encodeFunctionData('ADDRESS'),
            'ADDRESS',
        )

        expect(debugged.returnValue).toBe(
            addAddressPadding(opcodes.address).slice(2),
        )
    })

    it('should give the correct output for opcode: PUSH0', async () => {
        const clauses = [
            {
                data: ShanghaiCounter.bytecode,
                value: '0x0',
                to: null,
            },
        ]

        const tx = await wallet.sendClauses(clauses, false)

        const receipt = await pollReceipt(tx.id ?? '')

        expect(receipt.reverted).toBe(true)

        // 0x5f is the PUSH0 opcode
        const simulation = await Node1Client.executeAccountBatch({
            clauses,
            caller,
        })

        expect(simulation.body?.[0]?.vmError).toEqual('invalid opcode 0x5f')
    })
})
