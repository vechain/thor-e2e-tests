import { Client } from '../../../src/thor-client'

/**
 * @group api
 * @group peers
 */
describe('GET /node/network/peers', () => {
    it.e2eTest('should get peers', 'all', async () => {
        const peers = await Client.raw.getPeers()
        expect(peers.success, 'API Call should be a success').toBeTrue()
    })
})
