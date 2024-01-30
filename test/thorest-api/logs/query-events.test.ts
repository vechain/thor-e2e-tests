import { Node1Client } from '../../../src/thor-client'
import { contractAddresses } from '../../../src/contracts/addresses'
import assert from 'node:assert'
import { readRandomTransfer } from '../../../src/populated-data'

describe('POST /logs/event', () => {
    it('should find an event log', async () => {
        const transfer = readRandomTransfer()

        const eventLogs = await Node1Client.queryEventLogs({
            range: {
                to: transfer.meta.blockNumber,
                from: transfer.meta.blockNumber,
                unit: 'block',
            },
            options: {
                offset: 0,
                limit: 100,
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
            return log.meta?.txID === transfer.meta.txID
        })

        expect(relevantLog).not.toBeUndefined()
        expect(relevantLog?.meta?.txOrigin).toEqual(transfer.meta.txOrigin)
    })
})
