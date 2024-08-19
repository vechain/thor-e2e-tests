import { Client, Schema } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { interfaces } from '../../../src/contracts/hardhat'
import { HEX_AT_LEAST_1, HEX_REGEX_40 } from '../../../src/utils/hex-utils'
import {
    EvmMethods__factory,
    SimpleCounterParis__factory as ParisCounter,
} from '../../../typechain-types'
import { revisions } from '../../../src/constants'
import {
    addAddressPadding,
    addUintPadding,
} from '../../../src/utils/padding-utils'
import { ThorWallet } from '../../../src/wallet'

type TracerName = Schema['TracerOption']['name']

type StructLog = {
    pc: number
    op: string
    gas: number
    gasCost: number
    depth: number
    stack: string[]
}

const verifyStructLogs = (structLogs: StructLog[]) => {
    structLogs.forEach((log) => {
        expect(log).toMatchObject({
            pc: expect.any(Number),
            op: expect.any(String),
            gas: expect.any(Number),
            gasCost: expect.any(Number),
            depth: expect.any(Number),
            stack: expect.any(Array),
        })
    })
}

describe('POST /debug/tracers/call', () => {
    const transferFrom = '0xf077b491b355e64048ce21e3a6fc4751eeea77fa'
    const transferTo = '0x7567D83b7b8d80ADdCb281A71d54Fc7B3364ffed'
    const transferData = interfaces.energy.encodeFunctionData('transfer', [
        transferTo,
        100,
    ])

    const baseRequest = {
        to: contractAddresses.energy,
        data: transferData,
        value: '0x0',
        caller: transferFrom,
    }

    const newRequest = (tracer: TracerName, revision?: string) =>
        Client.raw.traceContractCall(
            {
                ...baseRequest,
                name: tracer,
            },
            revision,
        )

    it.e2eTest('should return 200 for no tracer', 'all', async () => {
        const response = await newRequest('')
        expect(response.httpCode).toBe(200)
        expect(response.body.structLogs.length).toBe(338)

        verifyStructLogs(response.body.structLogs)
    })

    it.e2eTest('should return 200 for tracer: opcount', 'all', async () => {
        const response = await newRequest('opcount')
        expect(response.httpCode).toBe(200)
        expect(typeof response.body).toBe('number')
    })

    type EvmdisObject = {
        depth: number
        len: number | undefined
        op: number
        result: string[]
    }

    it.e2eTest('should return 200 for tracer: evmdis', 'all', async () => {
        const response = await newRequest('evmdis')
        expect(response.httpCode).toBe(200)

        const body = response.body as EvmdisObject[]

        body.forEach((obj) => {
            expect(obj).toMatchObject({
                depth: expect.any(Number),
                op: expect.any(Number),
                result: expect.any(Array),
            })
            if (obj.len) {
                expect(obj.len).toBeGreaterThanOrEqual(1)
            }
        })
    })

    const grams: TracerName[] = ['trigram', 'bigram', 'unigram']
    grams.forEach((gram) => {
        it.e2eTest(`should return 200 for tracer: ${gram}`, 'all', async () => {
            const response = await newRequest(gram)
            expect(response.httpCode).toBe(200)

            const body = response.body as Record<string, number>

            Object.entries(body).forEach(([key, value]) => {
                expect(typeof key).toBe('string')
                expect(typeof value).toBe('number')
            })
        })
    })

    it.e2eTest('should return 200 for tracer: 4byte', 'all', async () => {
        const response = await newRequest('4byte')
        expect(response.httpCode).toBe(200)

        const body = response.body as Record<string, number>

        Object.entries(body).forEach(([key, value]) => {
            const [selector, calldata] = key.split('-')

            // expected format is 4byte selector
            expect(selector).toMatch(/^0x[a-f0-9]{8}$/)
            // expected format is number
            expect(calldata).toMatch(/^\d+$/)

            expect(typeof value).toBe('number')
        })
    })

    it.e2eTest('should return 200 for tracer: call', 'all', async () => {
        const response = await newRequest('call')
        expect(response.httpCode).toBe(200)

        const body = response.body as Record<string, string>

        expect(body.from).toBe('0xf077b491b355e64048ce21e3a6fc4751eeea77fa')
        expect(body.gas).toBe('0x0')
        expect(body.gasUsed).toBe('0x0')
        expect(body.to).toBe(contractAddresses.energy)
        expect(body.input).toBe(transferData)
        expect(body.output).toBe(
            '0x0000000000000000000000000000000000000000000000000000000000000001',
        )

        const calls = body.calls as unknown as any[]

        calls.forEach((call) => {
            expect(call.from).toMatch(HEX_REGEX_40)
            expect(call.gas).toMatch(HEX_AT_LEAST_1)
            expect(call.gasUsed).toMatch(HEX_AT_LEAST_1)
            expect(call.to).toMatch(HEX_REGEX_40)
            expect(call.input).toMatch(HEX_AT_LEAST_1)
            expect(call.value).toBe('0x0')
            expect(call.type).toBe('CALL')
            if (call.output) {
                expect.stringMatching(HEX_AT_LEAST_1)
            }
        })
    })

    type PrestateObject = {
        balance: string
        code: string
        storage?: Record<string, string>
    }

    it.e2eTest('should return 200 for tracer: prestate', 'all', async () => {
        const response = await newRequest('prestate')
        expect(response.httpCode).toBe(200)

        const body = response.body as Record<string, PrestateObject>

        const energyPrestate = body[contractAddresses.energy]
        expect(energyPrestate).toMatchObject({
            balance: expect.stringMatching(HEX_AT_LEAST_1),
            energy: expect.stringMatching(HEX_AT_LEAST_1),
            code: expect.stringMatching(HEX_AT_LEAST_1),
        })

        const toPrestate = body[transferTo.toLowerCase()]
        expect(toPrestate).toMatchObject({
            balance: expect.stringMatching(HEX_AT_LEAST_1),
            energy: expect.stringMatching(HEX_AT_LEAST_1),
        })

        const fromPrestate = body[transferFrom.toLowerCase()]
        expect(fromPrestate).toMatchObject({
            balance: expect.stringMatching(HEX_AT_LEAST_1),
            energy: expect.stringMatching(HEX_AT_LEAST_1),
        })
    })

    it.e2eTest('should return 200 for tracer: noop', 'all', async () => {
        const response = await newRequest('noop')
        expect(response.httpCode).toBe(200)
        expect(response.body).toEqual({})
    })

    it.e2eTest('should return 200 for empty body', 'all', async () => {
        const response = await Client.raw.traceContractCall({})
        expect(response.httpCode).toBe(200)
        expect(response.body).toEqual({
            gas: 0,
            failed: false,
            returnValue: '',
            structLogs: [],
        })
    })

    it.e2eTest('should return 200 for contract deployment', 'all', async () => {
        const response = await Client.raw.traceContractCall({
            data: ParisCounter.bytecode,
            value: '0x0',
            caller: transferFrom,
        })

        const body = response.body as Record<string, any>

        expect(body.gas).toEqual(0)
        expect(body.failed).toEqual(false)
        expect(body.returnValue).toMatch(HEX_AT_LEAST_1)
        expect(response.body.structLogs.length).toBe(23)
        verifyStructLogs(response.body.structLogs)
    })

    it.e2eTest('should return 403 for bad tracer name', 'all', async () => {
        const response = await newRequest('bad-tracer-name' as any)
        expect(response.httpCode).toBe(403)
    })

    it.e2eTest('should return 403 for empty body', 'all', async () => {
        const response = await Client.raw.traceContractCall('' as any)
        expect(response.httpCode).toBe(400)
    })

    revisions.valid(true).forEach((revision) => {
        it.e2eTest(
            `should return 200 with revision ${revision}`,
            'all',
            async () => {
                const response = await newRequest('call', revision)
                expect(response.httpCode).toBe(200)
            },
        )
    })

    revisions.invalid.forEach((revision) => {
        it.e2eTest(
            `should return 404 with revision ${revision}`,
            'all',
            async () => {
                const response = await newRequest('call', revision)
                expect(response.httpCode).toBe(400)
            },
        )
    })

    it.e2eTest('should return the correct provedWork', 'all', async () => {
        const provedWork = '0x12341234'

        const response = await Client.raw.traceContractCall({
            to: contractAddresses.extension,
            data: interfaces.extension.encodeFunctionData('txProvedWork'),
            provedWork,
            name: 'call',
            config: {
                OnlyTopCall: true,
            },
        })

        expect(response.httpCode).toBe(200)
        expect(response.body.output).toBe(addAddressPadding(provedWork))
    })

    it.e2eTest('should return the correct blockRef', 'all', async () => {
        const blockRef = await Client.sdk.blocks.getBestBlockRef()

        const response = await Client.raw.traceContractCall({
            to: contractAddresses.extension,
            data: interfaces.extension.encodeFunctionData('txBlockRef'),
            blockRef,
            name: 'call',
            config: {
                OnlyTopCall: true,
            },
        })

        expect(response.httpCode).toBe(200)
        expect(response.body.output).toContain(blockRef?.replace('0x', ''))
    })

    it.e2eTest('should return the correct gasPayer', 'all', async () => {
        const gasPayer = transferTo

        const response = await Client.raw.traceContractCall({
            to: contractAddresses.extension,
            data: interfaces.extension.encodeFunctionData('txGasPayer'),
            gasPayer,
            name: 'call',
            config: {
                OnlyTopCall: true,
            },
        })

        expect(response.httpCode).toBe(200)
        expect(response.body.output).toBe(addAddressPadding(gasPayer))
    })

    it.e2eTest('should return the correct expiration', 'all', async () => {
        const expiration = 1000

        const response = await Client.raw.traceContractCall({
            to: contractAddresses.extension,
            data: interfaces.extension.encodeFunctionData('txExpiration'),
            expiration,
            name: 'call',
            config: {
                OnlyTopCall: true,
            },
        })

        expect(response.httpCode).toBe(200)
        expect(response.body.output).toBe('0x' + addUintPadding(expiration))
    })

    it.e2eTest('should be able to get the gasPrice', 'all', async () => {
        const wallet = ThorWallet.withFunds()

        const methodsInterface = EvmMethods__factory.createInterface()
        const evmMethods = await wallet.deployContract(
            EvmMethods__factory.bytecode,
            EvmMethods__factory.abi,
        )

        const price = BigInt(11_222_3333)

        const response = await Client.raw.traceContractCall({
            to: evmMethods.address,
            data: methodsInterface.encodeFunctionData('getTxGasPrice'),
            gasPrice: '0x' + price.toString(16),
            name: 'call',
            config: {
                OnlyTopCall: true,
            },
        })

        expect(response.httpCode).toBe(200)
        expect(response.body.output).toBe('0x' + addUintPadding(price))
    })

    it.e2eTest('should revert for extremely low gas', 'all', async () => {
        const response = await Client.raw.traceContractCall({
            to: null,
            value: '0x0',
            data: EvmMethods__factory.bytecode,
            gas: 1,
            name: 'call',
            config: {
                OnlyTopCall: true,
            },
        })

        expect(response.httpCode).toBe(200)
        expect(response.body.error).toBe('out of gas')
    })
})
