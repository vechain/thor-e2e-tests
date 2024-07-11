import {
    Authority__factory,
    Energy__factory,
    Executor__factory,
    Extension__factory,
    Params__factory,
} from '../../typechain-types'
import { contractAddresses } from './addresses'

export const contracts = {
    energy: Energy__factory.connect(contractAddresses.energy),
    authority: Authority__factory.connect(contractAddresses.authority),
    extension: Extension__factory.connect(contractAddresses.extension),
    params: Params__factory.connect(contractAddresses.params),
    executor: Executor__factory.connect(contractAddresses.executor),
}

export const interfaces = {
    energy: contracts.energy.interface,
    authority: contracts.authority.interface,
    extension: contracts.extension.interface,
    params: contracts.params.interface,
    executor: contracts.executor.interface,
}
