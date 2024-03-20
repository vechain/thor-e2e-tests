// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract SimpleCounterParis {
    uint256 private counter;

    // Event emitted when the counter is incremented
    event CounterIncremented(uint256 newValue);

    // Constructor to initialize the counter with a default value
    constructor() {
        counter = 0;
    }

    // Function to get the current value of the counter
    function getCounter() external view returns (uint256) {
        return counter;
    }

    function incrementCounter() external {
        counter++;
        emit CounterIncremented(counter);
    }

    // Function to increment the counter
    function setCounter(uint256 amount) external {
        counter = amount;
        emit CounterIncremented(counter);
    }
}
