import { ThorWallet } from '../src/wallet'
import { SimpleTransfer__factory } from '../typechain-types'

it.e2eTest('should deploy simple transfer', 'all', async () => {
    const wallet = ThorWallet.withFunds()
    const contract = await wallet.deployContract(
        SimpleTransfer__factory.bytecode,
        SimpleTransfer__factory.abi,
    )

    console.log('Contract address:', contract.address)
})
