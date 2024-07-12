import {
    Authority__factory,
    Energy__factory,
    Executor__factory,
    Extension__factory,
    Params__factory,
} from '../../typechain-types'

export const interfaces = {
    energy: Energy__factory.createInterface(),
    authority: Authority__factory.createInterface(),
    extension: Extension__factory.createInterface(),
    params: Params__factory.createInterface(),
    executor: Executor__factory.createInterface(),
}
