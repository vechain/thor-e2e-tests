import { Client } from '../../../src/thor-client'
import { testCase } from '../../../src/test-case'

/**
 * @group api
 * @group peers
 */
describe('GET /node/network/peers', () => {
    testCase(['solo', 'default-private'])('should get peers', async () => {
        const peers = await Client.raw.getPeers()
        expect(peers.success, 'API Call should be a success').toBeTrue()
    })
})
