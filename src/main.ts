import { testEnv } from './test-env'

console.log(testEnv.urls)

//import { ThorWallet } from './wallet'

const parseAmount = (amount: number | string): number => {
    if (typeof amount === 'number') {
        return amount
    }

    return parseInt(amount)
}

//const wallet = new ThorWallet(Buffer.from('99f0500549792796c14fed62011a51081dc5b5e68fe8bd8a13b86be829c4fd36', 'hex'))
//
//const clauses: any[] = []
//const vetAmount = parseAmount(1)
//if (vetAmount > 0) {
//    clauses.push({
//        to: '0f872421dc479f3c11edd89512731814d0598db5',
//        value: vetAmount.toString(16),
//        data: '0x',
//    })
//}
//
//async function main() {
//    // Do stuff
//    const receipt = await wallet.sendClauses(clauses, true)
//    console.log(receipt)
//}
//
//main().then(() => { })
