// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract SimpleCounter {
    uint256 private counter = 0;

    // Event emitted when the counter is incremented
    event CounterIncremented(uint256 newValue);

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
