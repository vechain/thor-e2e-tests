'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.interfaces = exports.contracts = void 0
var typechain_types_1 = require('../../typechain-types')
var addresses_1 = require('./addresses')
exports.contracts = {
    energy: typechain_types_1.Energy__factory.connect(
        addresses_1.contractAddresses.energy,
    ),
    authority: typechain_types_1.Authority__factory.connect(
        addresses_1.contractAddresses.authority,
    ),
    extension: typechain_types_1.Extension__factory.connect(
        addresses_1.contractAddresses.extension,
    ),
    params: typechain_types_1.Params__factory.connect(
        addresses_1.contractAddresses.params,
    ),
    // executor: Executor__factory.connect(contractAddresses.executor),
}
exports.interfaces = {
    energy: exports.contracts.energy.interface,
    authority: exports.contracts.authority.interface,
    extension: exports.contracts.extension.interface,
    params: exports.contracts.params.interface,
    // executor: contracts.executor.interface,
}
