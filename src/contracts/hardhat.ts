import {
    Authority__factory,
    Energy__factory,
    Executor__factory,
    Extension__factory,
    Params__factory,
} from '../../typechain-types'

export const factories = {
    energy: Energy__factory,
    authority: Authority__factory,
    extension: Extension__factory,
    params: Params__factory,
    executor: Executor__factory,
}

export const interfaces = {
    energy: Energy__factory.createInterface(),
    authority: Authority__factory.createInterface(),
    extension: Extension__factory.createInterface(),
    params: Params__factory.createInterface(),
    executor: Executor__factory.createInterface(),
}
