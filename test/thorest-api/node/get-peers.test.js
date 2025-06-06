import { Client } from '../../../src/thor-client'
import { populatedData } from '../../../src/populated-data'

/**
 * @group api
 * @group node
 */
describe('GET /node/network/peers', () => {
    it.e2eTest('should get peers', 'all', async () => {
        const peers = await Client.raw.getPeers()

        expect(peers.success).toBeTruthy()
        expect(peers.headers['x-thorest-ver']).toBeDefined()
        expect(peers.headers['x-genesis-id']).toEqual(
            populatedData.read().genesisId,
        )
    })
})
