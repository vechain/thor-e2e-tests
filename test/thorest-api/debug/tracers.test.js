import { readRandomTransfer } from '../../../src/populated-data'
import { Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import { HEX_AT_LEAST_1, HEX_REGEX_40 } from '../../../src/utils/hex-utils'

const verifyStructLogs = (structLogs) => {
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

describe('POST /debug/tracers', () => {
    let target = ''
    let txIndex = 0
    let clauseIndex = 0

    let transfer
    beforeAll(async () => {
        transfer = await readRandomTransfer()
        const block = await Client.sdk.blocks.getBlockCompressed(
            transfer.meta.blockNumber,
        )
        txIndex = block.transactions.indexOf(transfer.meta.txID.toLowerCase())
        clauseIndex = 1
        target = `${transfer.meta.blockID}/${txIndex}/${clauseIndex}`
    })

    const newRequest = (tracer, config) =>
        Client.raw.traceClause({
            target,
            name: tracer,
            config,
        })

    it.e2eTest('should return 403 for none existed tracer', 'all', async () => {
        const res = await newRequest('bad-tracer-name')

        expect(res.httpCode).toBe(403)
    })

    it.e2eTest('should return 200 for structLogger tracer', 'all', async () => {
        const res = await newRequest('structLogger')

        expect(res.httpCode).toBe(200)
        verifyStructLogs(res.body.structLogs)
        expect(res.body.failed).toBe(false)
        expect(res.body.gas).toBeGreaterThan(0)
    })

    it.e2eTest('should return 200 for default tracer', 'all', async () => {
        const res = await newRequest('')

        expect(res.httpCode).toBe(200)
        verifyStructLogs(res.body.structLogs)
        expect(res.body.failed).toBe(false)
        expect(res.body.gas).toBeGreaterThan(0)
    })

    it.e2eTest('should return 200 for tracer: opcount', 'all', async () => {
        const response = await newRequest('opcount')
        expect(response.httpCode).toBe(200)
        expect(typeof response.body).toBe('number')
    })

    it.e2eTest('should return 200 for tracer: evmdis', 'all', async () => {
        const response = await newRequest('evmdis')
        expect(response.httpCode).toBe(200)

        const body = response.body

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

    const grams = ['trigram', 'bigram', 'unigram']
    grams.forEach((gram) => {
        it.e2eTest(`should return 200 for tracer: ${gram}`, 'all', async () => {
            const response = await newRequest(gram)
            expect(response.httpCode).toBe(200)

            const body = response.body

            Object.entries(body).forEach(([key, value]) => {
                expect(typeof key).toBe('string')
                expect(typeof value).toBe('number')
            })
        })
    })

    it.e2eTest('should return 200 for tracer: 4byte', 'all', async () => {
        const response = await newRequest('4byte')
        expect(response.httpCode).toBe(200)

        const body = response.body

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

        const body = response.body

        expect(body.from).toBe(transfer.vet.sender.toLowerCase())
        expect(body.gas).toMatch(HEX_AT_LEAST_1)
        expect(body.gasUsed).toMatch(HEX_AT_LEAST_1)
        expect(body.to).toBe(contractAddresses.energy)
        // transfer function selector
        expect(body.input).toStartWith('0xa9059cbb')
        expect(body.output).toBe(
            '0x0000000000000000000000000000000000000000000000000000000000000001',
        )

        const calls = body.calls

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

    it.e2eTest('should return 200 for tracer: prestate', 'all', async () => {
        const response = await newRequest('prestate')
        expect(response.httpCode).toBe(200)

        const body = response.body

        const energyPrestate = body[contractAddresses.energy]
        expect(energyPrestate).toMatchObject({
            balance: expect.stringMatching(HEX_AT_LEAST_1),
            energy: expect.stringMatching(HEX_AT_LEAST_1),
            code: expect.stringMatching(HEX_AT_LEAST_1),
        })

        const addresses = Object.keys(body).filter(
            (addr) => addr !== contractAddresses.energy,
        )

        addresses.forEach((addr) => {
            expect(body[addr].balance).toMatch(HEX_AT_LEAST_1)
            expect(body[addr].energy).toMatch(HEX_AT_LEAST_1)
        })
    })

    it.e2eTest('should return 200 for tracer: noop', 'all', async () => {
        const response = await newRequest('noop')
        expect(response.httpCode).toBe(200)
        expect(response.body).toEqual({})
    })

    it.e2eTest('should return 403 for bad tracer name', 'all', async () => {
        const response = await newRequest('bad-tracer-name')
        expect(response.httpCode).toBe(403)
    })

    it.e2eTest('should return bad target', 'all', async () => {
        const res = await Client.raw.traceClause({
            target: 'bad-target',
            name: 'structLogger',
        })
        expect(res.httpCode).toBe(400)
    })

    it.e2eTest(
        'should return 403 for bad target (clause index out of bounds)',
        'all',
        async () => {
            const res = await Client.raw.traceClause({
                target: `${transfer.meta.blockID}/${txIndex}/100000`,
            })
            expect(res.httpCode).toBe(403)
        },
    )

    it.e2eTest(
        'should return 403 for bad target (tx index out of bounds)',
        'all',
        async () => {
            const res = await Client.raw.traceClause({
                target: `${transfer.meta.blockID}/100000/${clauseIndex}`,
            })
            expect(res.httpCode).toBe(403)
        },
    )

    it.e2eTest('should be able pass config', 'all', async () => {
        const response = await newRequest('call', { OnlyTopCall: true })
        expect(response.httpCode).toBe(200)
        expect(response.body).toMatchObject({
            from: expect.stringMatching(HEX_REGEX_40),
            gas: expect.stringMatching(HEX_AT_LEAST_1),
            gasUsed: expect.stringMatching(HEX_AT_LEAST_1),
            to: expect.stringMatching(HEX_REGEX_40),
            input: expect.stringMatching(HEX_AT_LEAST_1),
            output: expect.stringMatching(HEX_AT_LEAST_1),
            value: '0x0',
            type: 'CALL',
        })
    })
})
