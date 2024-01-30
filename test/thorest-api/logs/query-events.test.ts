import { Node1Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import assert from 'node:assert'
import { readPopulatedData } from '../../../src/populated-data'

describe('POST /logs/event', () => {
    it('should find an event log', async () => {
        const chainData = readPopulatedData()
        const receipt = chainData.transfers[0].receipt

        const eventLogs = await Node1Client.queryEventLogs({
            range: {
                to: receipt.meta.blockNumber,
                from: receipt.meta.blockNumber,
                unit: 'block',
            },
            options: {
                offset: 0,
                limit: 10_000,
            },
            criteriaSet: [
                {
                    address: contractAddresses.energy,
                },
            ],
        })

        assert(eventLogs.success, 'eventLogs.success is false')

        expect(eventLogs.httpCode).toEqual(200)

        const relevantLog = eventLogs.body.find((log) => {
            return log.meta?.txID === receipt.meta.txID
        })

        expect(relevantLog).not.toBeUndefined()
        expect(relevantLog?.meta?.txOrigin).toEqual(receipt.meta.txOrigin)
    })
})
