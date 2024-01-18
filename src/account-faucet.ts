import { sendClauses } from './transactions'
import { contractAddresses } from './contracts/addresses'
import { interfaces } from './contracts/hardhat'

const fundingAccounts = [
    {
        address: '0x98f939235e4d31e072e0a0ca47984124a94f4c55',
        privateKey:
            'bf35d73a1f03cdd53c695c9bc282fcc1f4a2c4e7c3904cd204ab22dc578bf09b',
    },
    {
        address: '0xb4fc0e858a5ac5510ed59e4d927fa3976f109e1a',
        privateKey:
            '72ebe4f2fbf51ea88d03d485930f917d011bbed87cabd8091a67332bfb5f64e5',
    },
    {
        address: '0x205e4e58f69180b6e10acdd08dfc8c73281e57cf',
        privateKey:
            'ff29c6133091016cb4ac7422e295040e9eaa5ae356c9e9a22a936d7c58a20d7e',
    },
    {
        address: '0x961e4c32f9ce93739cdd7efa90ac94763962ff18',
        privateKey:
            '14c93399b4afd680268c0babb857d28e1e99ed62f2eaf8a063ee33361926026f',
    },
    {
        address: '0x1550146a44ccbf720e6a17485eae9f8c136517c5',
        privateKey:
            '4c61d0dd60af4f1a932db84e6b21e13113e5b67c5b6ce1d9ff1f9ad77acf89ae',
    },
    {
        address: '0xad365f30b543318b33208dd843d80c78d1e50b0d',
        privateKey:
            '5d98fedf4fce0f78e2d6327e76cacab2984bec10d949f32b8ecf3ca45db68f0b',
    },
    {
        address: '0x2d50ef10018a8395614e773ff5b3906ed4f09602',
        privateKey:
            '5f379b79286b9ced9dac48159ce115f3d5f08a928fb63a92b52b6aba94d8ef60',
    },
    {
        address: '0x80e29b7ef2b0b3adcbf0311647e30473a82951bf',
        privateKey:
            '4076e08861c36bb55d36c2c693ed3b6ff3d29887613c703747a51f5ca05120ba',
    },
    {
        address: '0x334fe4086ed960d106b40e849d37ba1edde9e9cb',
        privateKey:
            '701fcee2fa6e4bded2f3d1bde9f6979e0154661bcbdeb9d8022f2e0bbae1f4f9',
    },
    {
        address: '0x8e8aa6561dd091c7e08ae07ae7e43fe0f0fd8e7e',
        privateKey:
            '06a9b1908c9024f593998a8c52379b7cca189fc579dee1ae70cf34603faf2bf3',
    },
]

export const FUND_AMOUNT = '0x65536000000000000000000'

export const fundAccount = async (account: string) => {
    const randomIndex = Math.floor(Math.random() * fundingAccounts.length)
    const fundingAccount = fundingAccounts[randomIndex]

    const receipt = await sendClauses(
        [
            {
                to: account,
                value: FUND_AMOUNT,
                data: '0x',
            },
            {
                to: contractAddresses.energy,
                value: '0x0',
                data: interfaces.energy.encodeFunctionData('transfer', [
                    account,
                    FUND_AMOUNT,
                ]),
            },
        ],
        fundingAccount.privateKey,
        true,
    )

    return { receipt, amount: FUND_AMOUNT }
}