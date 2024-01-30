import { Node1Client } from '../../../src/thor-client'
import assert from 'node:assert'
import { readRandomTransfer } from '../../../src/populated-data'

describe('POST /logs/transfers', () => {
    it('should find an event log', async () => {
        const transfer = readRandomTransfer()

        const eventLogs = await Node1Client.queryTransferLogs({
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
                    txOrigin: transfer.meta?.txOrigin,
                },
            ],
        })

        assert(eventLogs.success, 'eventLogs.success is false')

        const relevantLog = eventLogs.body.find((log) => {
            return log.meta?.txID === transfer.meta?.txID
        })

        expect(relevantLog).not.toBeUndefined()
        expect(relevantLog?.meta?.txOrigin).toEqual(transfer.meta?.txOrigin)
    })
})
