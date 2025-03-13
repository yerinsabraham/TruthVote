// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "@thirdweb-dev/contracts/eip/interface/IERC20.sol";
import {Ownable} from "@thirdweb-dev/contracts/extension/Ownable.sol";
import {ReentrancyGuard} from "@thirdweb-dev/contracts/external-deps/openzeppelin/security/ReentrancyGuard.sol";

/**
 * @title TruthVote
 * @dev A prediction market contract for TruthVote where users stake USDT on outcomes with a 2% withdrawal fee.
 */
contract TruthVote is Ownable, ReentrancyGuard {
    /// @notice Market prediction outcome enum
    enum MarketOutcome {
        UNRESOLVED,
        OPTION_A,
        OPTION_B
    }

    /// @dev Represents a prediction market with a category.
    struct Market {
        string question;
        uint256 endTime;
        MarketOutcome outcome;
        string optionA;
        string optionB;
        uint256 totalOptionAShares;
        uint256 totalOptionBShares;
        bool resolved;
        mapping(address => uint256) optionASharesBalance;
        mapping(address => uint256) optionBSharesBalance;
        mapping(address => bool) hasClaimed;
        uint256 category; // Added category ID
    }

    IERC20 public bettingToken;
    uint256 public marketCount;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => string) public categoryNames; // Maps category IDs to names
    uint256 public categoryCount; // Tracks number of categories

    /// @notice Emitted when a new market is created.
    event MarketCreated(
        uint256 indexed marketId,
        string question,
        string optionA,
        string optionB,
        uint256 endTime,
        uint256 category
    );

    /// @notice Emitted when shares are purchased in a market.
    event SharesPurchased(
        uint256 indexed marketId,
        address indexed buyer,
        bool isOptionA,
        uint256 amount
    );

    /// @notice Emitted when a market is resolved with an outcome.
    event MarketResolved(uint256 indexed marketId, MarketOutcome outcome);

    /// @notice Emitted when winnings are claimed by a user.
    event Claimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount,
        uint256 fee
    );

    /// @notice Emitted when a new category is added.
    event CategoryAdded(uint256 indexed categoryId, string name);

    constructor(address _bettingToken) {
        bettingToken = IERC20(_bettingToken);
        _setupOwner(msg.sender); // Set the contract deployer as the owner
    }

    function _canSetOwner() internal view virtual override returns (bool) {
        return msg.sender == owner();
    }

    /// @notice Adds a new category to the platform (owner-only).
    /// @param _name The name of the category (e.g., "Crypto").
    /// @return categoryId The ID assigned to the new category.
    function addCategory(string memory _name) external returns (uint256) {
        require(msg.sender == owner(), "Only owner can add categories");
        require(bytes(_name).length > 0, "Category name cannot be empty");

        uint256 categoryId = categoryCount++;
        categoryNames[categoryId] = _name;

        emit CategoryAdded(categoryId, _name);
        return categoryId;
    }

    /// @notice Creates a new prediction market with a category.
    /// @param _question The question for the market.
    /// @param _optionA The first option for the market.
    /// @param _optionB The second option for the market.
    /// @param _duration The duration for which the market is active.
    /// @param _categoryId The category ID for the market.
    /// @return marketId The ID of the newly created market.
    function createMarket(
        string memory _question,
        string memory _optionA,
        string memory _optionB,
        uint256 _duration,
        uint256 _categoryId
    ) external returns (uint256) {
        require(msg.sender == owner(), "Only owner can create markets");
        require(_duration > 0, "Duration must be positive");
        require(
            bytes(_optionA).length > 0 && bytes(_optionB).length > 0,
            "Options cannot be empty"
        );
        require(_categoryId < categoryCount, "Invalid category ID");

        uint256 marketId = marketCount++;
        Market storage market = markets[marketId];

        market.question = _question;
        market.optionA = _optionA;
        market.optionB = _optionB;
        market.endTime = block.timestamp + _duration;
        market.outcome = MarketOutcome.UNRESOLVED;
        market.category = _categoryId;

        emit MarketCreated(
            marketId,
            _question,
            _optionA,
            _optionB,
            market.endTime,
            _categoryId
        );
        return marketId;
    }

    function buyShares(
        uint256 _marketId,
        bool _isOptionA,
        uint256 _amount
    ) external {
        Market storage market = markets[_marketId];
        require(
            block.timestamp < market.endTime,
            "Market trading period has ended"
        );
        require(!market.resolved, "Market already resolved");
        require(_amount > 0, "Amount must be positive");

        require(
            bettingToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );

        if (_isOptionA) {
            market.optionASharesBalance[msg.sender] += _amount;
            market.totalOptionAShares += _amount;
        } else {
            market.optionBSharesBalance[msg.sender] += _amount;
            market.totalOptionBShares += _amount;
        }

        emit SharesPurchased(_marketId, msg.sender, _isOptionA, _amount);
    }

    function resolveMarket(uint256 _marketId, MarketOutcome _outcome) external {
        require(msg.sender == owner(), "Only owner can resolve markets");
        Market storage market = markets[_marketId];
        require(block.timestamp >= market.endTime, "Market hasn't ended yet");
        require(!market.resolved, "Market already resolved");
        require(_outcome != MarketOutcome.UNRESOLVED, "Invalid outcome");

        market.outcome = _outcome;
        market.resolved = true;

        emit MarketResolved(_marketId, _outcome);
    }

    /// @notice Claims winnings with a 2% fee deducted for the owner.
    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.resolved, "Market not resolved yet");
        require(!market.hasClaimed[msg.sender], "Winnings already claimed");

        uint256 userShares;
        uint256 winningShares;
        uint256 losingShares;

        if (market.outcome == MarketOutcome.OPTION_A) {
            userShares = market.optionASharesBalance[msg.sender];
            winningShares = market.totalOptionAShares;
            losingShares = market.totalOptionBShares;
            market.optionASharesBalance[msg.sender] = 0;
        } else if (market.outcome == MarketOutcome.OPTION_B) {
            userShares = market.optionBSharesBalance[msg.sender];
            winningShares = market.totalOptionBShares;
            losingShares = market.totalOptionAShares;
            market.optionBSharesBalance[msg.sender] = 0;
        } else {
            revert("Market outcome is not valid");
        }

        require(userShares > 0, "No winnings to claim");

        uint256 rewardRatio = (losingShares * 1e18) / winningShares;
        uint256 winnings = userShares + (userShares * rewardRatio) / 1e18;

        // Calculate 2% fee and net winnings
        uint256 fee = (winnings * 2) / 100;
        uint256 netWinnings = winnings - fee;

        market.hasClaimed[msg.sender] = true;

        require(
            bettingToken.transfer(msg.sender, netWinnings),
            "Token transfer failed"
        );
        require(
            bettingToken.transfer(owner(), fee),
            "Fee transfer failed"
        );

        emit Claimed(_marketId, msg.sender, netWinnings, fee);
    }

    function getMarketInfo(
        uint256 _marketId
    )
        external
        view
        returns (
            string memory question,
            string memory optionA,
            string memory optionB,
            uint256 endTime,
            MarketOutcome outcome,
            uint256 totalOptionAShares,
            uint256 totalOptionBShares,
            bool resolved,
            uint256 category
        )
    {
        Market storage market = markets[_marketId];
        return (
            market.question,
            market.optionA,
            market.optionB,
            market.endTime,
            market.outcome,
            market.totalOptionAShares,
            market.totalOptionBShares,
            market.resolved,
            market.category
        );
    }

    function getSharesBalance(
        uint256 _marketId,
        address _user
    ) external view returns (uint256 optionAShares, uint256 optionBShares) {
        Market storage market = markets[_marketId];
        return (
            market.optionASharesBalance[_user],
            market.optionBSharesBalance[_user]
        );
    }

    function batchClaimWinnings(
        uint256 _marketId,
        address[] calldata _users
    ) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.resolved, "Market not resolved yet");

        for (uint256 i = 0; i < _users.length; i++) {
            address user = _users[i];
            if (market.hasClaimed[user]) {
                continue;
            }

            uint256 userShares;
            uint256 winningShares;
            uint256 losingShares;

            if (market.outcome == MarketOutcome.OPTION_A) {
                userShares = market.optionASharesBalance[user];
                winningShares = market.totalOptionAShares;
                losingShares = market.totalOptionBShares;
                market.optionASharesBalance[user] = 0;
            } else if (market.outcome == MarketOutcome.OPTION_B) {
                userShares = market.optionBSharesBalance[user];
                winningShares = market.totalOptionBShares;
                losingShares = market.totalOptionAShares;
                market.optionBSharesBalance[user] = 0;
            } else {
                revert("Market outcome is not valid");
            }

            if (userShares == 0) {
                continue;
            }

            uint256 rewardRatio = (losingShares * 1e18) / winningShares;
            uint256 winnings = userShares + (userShares * rewardRatio) / 1e18;

            // Calculate 2% fee and net winnings
            uint256 fee = (winnings * 2) / 100;
            uint256 netWinnings = winnings - fee;

            market.hasClaimed[user] = true;

            require(
                bettingToken.transfer(user, netWinnings),
                "Token transfer failed"
            );
            require(
                bettingToken.transfer(owner(), fee),
                "Fee transfer failed"
            );

            emit Claimed(_marketId, user, netWinnings, fee);
        }
    }
}