import { EvmMethods__factory } from '../../typechain-types'
import { ThorWallet } from '../../src/wallet'
import { HEX_REGEX_40 } from '../../src/utils/hex-utils'
import { ABIFunction, Keccak256, Txt } from "@vechain/sdk-core";

describe('EVM methods', () => {
    let evmMethods
    const wallet = ThorWallet.withFunds()

    beforeAll(async () => {
        evmMethods = await wallet.deployContract(
            EvmMethods__factory.bytecode,
            EvmMethods__factory.abi,
        )
    })

    it.e2eTest('should be able to get the "block.number"', 'all', async () => {
        const res = await evmMethods.read.getBlockNumber()
        expect(res[0]).toBeGreaterThan(0)
    })

    it.e2eTest('should be able to get the "block.basefee"', 'all', async () => {
        const res = await evmMethods.read.getBaseFee()
        // TODO: this is a negative test, vechain EVM does not have 'block.basefee'
        expect(res).toEqual('')
    })

    it.e2eTest('should be able to get the "block.chainid"', 'all', async () => {
        const chainId = await evmMethods.read.getChainId()
        expect(chainId[0]).toBeGreaterThan(0)
    })

    it.e2eTest(
        'should be able to get the "block.coinbase"',
        'all',
        async () => {
            const coinbase = await evmMethods.read.getCoinbase()
            expect(coinbase[0]).toMatch(HEX_REGEX_40)
        },
    )

    it.e2eTest(
        'should be able to get the "block.difficulty"',
        'all',
        async () => {
            const difficulty = await evmMethods.read.getBlockDifficulty()
            expect(difficulty[0]).toEqual(0n)
        },
    )

    it.e2eTest(
        'should be able to get the "block.gaslimit"',
        'all',
        async () => {
            const gasLimit = await evmMethods.read.getGasLimit()
            expect(gasLimit[0]).toBeGreaterThan(0)
        },
    )

    it.e2eTest(
        'should be able to get the "block.prevrandao"',
        'all',
        async () => {
            const prevRandao = await evmMethods.read.getPrevRandao()
            expect(prevRandao[0]).toEqual(0n)
        },
    )

    it.e2eTest(
        'should be able to get the "block.timestamp"',
        'all',
        async () => {
            const timestamp = await evmMethods.read.getTimestamp()
            expect(timestamp[0]).toBeGreaterThan(0n)
        },
    )

    it.e2eTest('should be able to get "gasleft"', 'all', async () => {
        const gasLeft = await evmMethods.read.getGasLeft()
        expect(gasLeft[0]).toBeGreaterThan(0)
    })

    it.e2eTest('should be able to get "msg.data"', 'all', async () => {
        const msgData = await evmMethods.read.getMsgData()
        expect(msgData[0]).toEqual('0xc8e7ca2e')
    })

    it.e2eTest('should be able to get "msg.sender"', 'all', async () => {
        const msgSender = await evmMethods.read.getMsgSender()
        expect(msgSender[0].toString().toLowerCase()).toEqual(
            wallet.address.toLowerCase(),
        )
    })

    it.e2eTest('should be able to get "msg.sig"', 'all', async () => {
        const msgSig = await evmMethods.read.getMsgSig()
        expect(msgSig[0]).toEqual('0x5a8f6d71')
    })

    it.e2eTest('should be able to get "msg.value"', 'all', async () => {
        const msgValue = await evmMethods.transact.getMsgValue()
        const receipt = await msgValue.wait()
        expect(receipt?.reverted).toBeFalsy()
    })

    it.e2eTest('should be able to get "tx.gasprice"', 'all', async () => {
        const txGasPrice = await evmMethods.read.getTxGasPrice()
        expect(txGasPrice[0]).toEqual(0n)
    })

    it.e2eTest('should be able to get "tx.origin"', 'all', async () => {
        const txOrigin = await evmMethods.read.getTxOrigin()
        expect(txOrigin[0].toString().toLowerCase()).toEqual(
            wallet.address.toLowerCase(),
        )
    })

    it.e2eTest(
        'should be able to get the contract address',
        'all',
        async () => {
            const contractAddress = await evmMethods.read.getContractAddress()
            expect(contractAddress[0].toString().toLowerCase()).toEqual(
                evmMethods.address.toLowerCase(),
            )
        },
    )

    it.e2eTest(
        'should be able to get the contract balance',
        'all',
        async () => {
            const contractBalance = await evmMethods.read.getContractBalance()
            expect(contractBalance[0]).toEqual(0n)
        },
    )

    it.e2eTest(
        'should be able to get the current timestamp',
        'all',
        async () => {
            const currentTimestamp = await evmMethods.read.getCurrentTimestamp()
            expect(currentTimestamp[0]).toBeGreaterThan(0n)
        },
    )

    it.e2eTest('should revert with message', 'all', async () => {
        const res = await evmMethods.read.revertWithMessage('Error')
        expect(res).toEqual('Error')
    })

    it.e2eTest('should require condition to be true', 'all', async () => {
        const res = await evmMethods.read.requireCondition(true, 'Error')
        expect(res).toEqual([])
    })

    it.e2eTest('should require condition to be true', 'all', async () => {
        const res = await evmMethods.read.requireCondition(false, 'Error')
        expect(res).toEqual('Error')
    })

    it.e2eTest('should assert condition to be true', 'all', async () => {
        const res = await evmMethods.read.assertCondition(true, 'Error')
        expect(res).toEqual([])
    })

    it.e2eTest('should call external function', 'all', async () => {
        // Mock external contract call here
    })

    it.e2eTest('should delegate call external function', 'all', async () => {
        // Mock external contract delegate call here
    })

    it.e2eTest('should encode data', 'all', async () => {
        const encodedData = await evmMethods.read.encodeData(123)
        expect(encodedData[0]).toEqual(
            '0x000000000000000000000000000000000000000000000000000000000000007b',
        )
    })

    it.e2eTest('should decode data', 'all', async () => {
        const data = await evmMethods.read.encodeData(123)
        const decodedValue = await evmMethods.read.decodeData(data[0])
        expect(decodedValue[0]).toEqual(123n)
    })

    it.e2eTest('should calculate keccak256', 'all', async () => {
        const data = Txt.of('test data').bytes
        const hash = await evmMethods.read.calculateKeccak256(data)
        const expectedHash = Keccak256.of(data).bytes
        expect(hash[0]).toEqual(
            '0x' + Buffer.from(expectedHash).toString('hex'),
        )
    })
})
