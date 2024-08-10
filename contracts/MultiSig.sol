// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract MultiSig {
    address[] public owners;
    uint256 public required;
    uint public transactionCount;

    mapping(uint => Transaction) public transactions;
    mapping(uint => mapping(address => bool)) public confirmations;

    struct Transaction {
        address payable recipient;
        uint amount;
        bool executed;
        bytes data;
    }

    constructor(address[] memory _owners, uint _required) {
        require(_owners.length > 0);
        require(_required != 0);
        require(_required < _owners.length);
        owners = _owners;
        required = _required;
    }

    function addTransaction(
        address payable addr,
        uint amount,
        bytes memory data
    ) internal returns (uint tID) {
        transactions[transactionCount] = Transaction(addr, amount, false, data);
        tID = transactionCount;
        transactionCount++;
    }

    function confirmTransaction(uint _tID) public {
        for (uint i = 0; i < owners.length; i++) {
            if (msg.sender == owners[i]) {
                confirmations[_tID][msg.sender] = true;
                if (isConfirmed(_tID)) executeTransaction(_tID);
                return;
            }
        }

        revert();
    }

    function getConfirmationsCount(uint _tID) public view returns (uint count) {
        for (uint i = 0; i < owners.length; i++) {
            if (confirmations[_tID][owners[i]]) {
                count++;
            }
        }
    }

    function submitTransaction(
        address payable _addr,
        uint _amount,
        bytes memory _data
    ) external {
        uint _id = addTransaction(_addr, _amount, _data);
        confirmTransaction(_id);
    }

    function isConfirmed(uint _tID) public view returns (bool) {
        return getConfirmationsCount(_tID) >= required;
    }

    function executeTransaction(uint _tID) public {
        require(isConfirmed(_tID));
        Transaction storage _tx = transactions[_tID];
        (bool success, ) = _tx.recipient.call{value: _tx.amount}(_tx.data);
        require(success, "Failed to execute transaction");
        _tx.executed = true;
    }

    receive() external payable {}
}
