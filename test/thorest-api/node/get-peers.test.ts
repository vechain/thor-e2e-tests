import { Client } from '../../../src/thor-client'

/**
 * @group api
 * @group peers
 */
describe('GET /node/network/peers', () => {
    it('should get peers', async () => {
        const peers = await Client.raw.getPeers()
        expect(peers.success, 'API Call should be a success').toBeTrue()
    })
})
