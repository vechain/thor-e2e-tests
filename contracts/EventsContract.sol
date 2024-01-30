// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract EventsContract {
    event QuadrupleTopicEvent(address indexed addr1, address indexed addr2, address indexed addr3, address addr4);

    function emitQuadrupleEvent(address addr1, address addr2, address addr3, address addr4) external {
        emit QuadrupleTopicEvent(addr1, addr2, addr3, addr4);
    }
}
