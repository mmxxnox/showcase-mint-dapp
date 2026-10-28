// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Test helper: pushes ETH into a contract that has no payable entry point, via SELFDESTRUCT.
contract ForceSend {
    constructor(address payable target) payable {
        selfdestruct(target);
    }
}
