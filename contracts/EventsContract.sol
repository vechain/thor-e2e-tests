// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EventsContract {


    address[] public addresses = [0x5B38Da6a701c568545dCfcB03FcB875f56beddC4, 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2, 0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db];

    constructor() {
        emit MyEvent(addresses[0], addresses[1], addresses[2]);
    }

    function getAddresses() public view returns (address[] memory) {
        return addresses;
    }

    event MyEvent(address indexed sender, address indexed value1, address indexed value2);

    function triggerAssemblyEvent() public {
        bytes32 _id = hex"420042";
        bytes32 t1 = bytes32(uint256(123));
        bytes32 t2 = bytes32(keccak256("Deposit(address,bytes32,uint256,address)"));
        bytes32 t3 = bytes32(uint256(uint160(addresses[0])));
        bytes32 t4 = bytes32(uint256(uint160(addresses[1])));
        assembly {
            let p := mload(0x40)
            mstore(p, t1)
            log4(p, 0x20, t2, t3, t4, _id)
        }
    }

}
