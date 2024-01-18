import { Node1Client } from '../../../src/thor-client'
import assert from 'node:assert'
import { contractAddresses } from '../../../src/contracts/addresses'
import { MyERC20__factory } from '../../../typechain-types'
import {
    generateEmptyWallet,
    generateWalletWithFunds,
    Wallet,
} from '../../../src/wallet'

describe('POST /accounts/*', function () {
    let wallet: Wallet

    beforeAll(async () => {
        wallet = await generateWalletWithFunds()
    })

    it('should execute code', async function () {
        const to = generateEmptyWallet()

        const res = await Node1Client.executeAccountBatch({
            clauses: [
                // VET Transfer
                {
                    to: to.address,
                    value: '0x100000',
                    data: '0x',
                },
                // VTHO Transfer (Contract Call)
                {
                    to: contractAddresses.energy,
                    value: '0x0',
                    data: '0xa9059cbb0000000000000000000000000f872421dc479f3c11edd89512731814d0598db50000000000000000000000000000000000000000000000013f306a2409fc0000',
                },
                // Contract Deployment
                {
                    value: '0x0',
                    data: MyERC20__factory.createInterface().encodeDeploy(),
                },
            ],
            caller: wallet.address,
        })

        assert(res.success, 'Failed to execute code')

        expect(res.body[0].reverted).toEqual(false)
    })
})
