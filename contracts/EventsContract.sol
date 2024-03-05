// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EventsContract {

    // Define the event with 3 parameters, all addresses
    event MyEvent(address indexed sender, address indexed value1, address indexed value2);

    function emitTripleEvent(address _address1, address _address2, address _address3) public {
        emit MyEvent(_address1, _address2, _address3);
    }
}
