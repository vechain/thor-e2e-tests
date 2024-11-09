import { Client } from '../../../src/thor-client'

/**
 * @group api
 * @group peers
 */
describe('GET /node/network/peers', () => {
    it.e2eTest('should get peers', 'all', async () => {
        const peers = await Client.raw.getPeers()

        expect(peers.success).toEqual(true)
        expect(peers.headers['x-thorest-ver']).toBeDefined()
        expect(peers.headers['x-genesis-id']).toBeDefined()
    })
})
