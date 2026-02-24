// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SocialFiTreasury
 * @author SocialFi Team
 * @notice Treasury/Escrow contract for the SocialFi DApp.
 *         Handles merchant USDT deposits for ad campaigns and
 *         batch-distributes reward tokens to users and affiliates.
 *
 * @dev Security mechanisms:
 *      - AccessControl: Role-based permissioning (ADMIN + DISTRIBUTOR).
 *      - ReentrancyGuard: Prevents re-entrancy on all external-call functions.
 *      - SafeERC20: Handles non-standard ERC20 return values (e.g. USDT).
 *      - Pausable: Circuit-breaker for emergency situations.
 *      - Input validation: Array length checks, zero-address/zero-amount guards.
 *
 * Gas optimizations:
 *      - `calldata` arrays in batchDistributeRewards (no memory copy).
 *      - `unchecked` arithmetic where overflow is impossible.
 *      - Local variable caching to reduce SLOADs.
 *      - Minimal storage writes in batch loops.
 */
contract SocialFiTreasury is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════
    // ROLES
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Role granted to the backend's hot wallet to execute batch payouts.
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice USDT token accepted for merchant ad deposits.
    IERC20 public immutable usdtToken;

    /// @notice Platform's native reward token distributed to users.
    IERC20 public immutable rewardToken;

    /// @notice Running total of USDT deposited by merchants.
    uint256 public totalUsdtDeposited;

    /// @notice Running total of USDT withdrawn by admin (platform revenue).
    uint256 public totalUsdtWithdrawn;

    /// @notice Running total of reward tokens distributed to users.
    uint256 public totalRewardsDistributed;

    /// @notice Running total of reward tokens funded into the contract.
    uint256 public totalRewardsFunded;

    /// @notice Maximum number of recipients per batch call (gas safety cap).
    uint256 public maxBatchSize;

    /// @notice Tracks USDT deposited per campaign ID to prevent double-funding.
    mapping(string => uint256) public campaignDeposits;

    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Emitted when a merchant deposits USDT to fund an ad campaign.
    /// @param merchant  The merchant's wallet address.
    /// @param amount    The USDT amount deposited (in token decimals).
    /// @param campaignId Off-chain campaign identifier from the backend.
    event CampaignFunded(
        address indexed merchant,
        uint256 amount,
        string campaignId
    );

    /// @notice Emitted when the backend batch-distributes reward tokens.
    /// @param totalUsers  Number of recipients in this batch.
    /// @param totalAmount Sum of all reward tokens distributed in this batch.
    event RewardsDistributed(uint256 totalUsers, uint256 totalAmount);

    /// @notice Emitted when the admin funds the reward pool.
    /// @param funder The address that funded the pool.
    /// @param amount The reward token amount added.
    event RewardPoolFunded(address indexed funder, uint256 amount);

    /// @notice Emitted when the admin withdraws collected USDT revenue.
    /// @param to     Destination address.
    /// @param amount USDT amount withdrawn.
    event UsdtWithdrawn(address indexed to, uint256 amount);

    /// @notice Emitted when the admin recovers an accidentally sent token.
    /// @param token  The ERC20 token recovered.
    /// @param to     Destination address.
    /// @param amount Amount recovered.
    event TokenRecovered(address indexed token, address indexed to, uint256 amount);

    /// @notice Emitted when the max batch size is updated.
    /// @param oldSize Previous max batch size.
    /// @param newSize New max batch size.
    event MaxBatchSizeUpdated(uint256 oldSize, uint256 newSize);

    // ═══════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════

    error ZeroAddress();
    error ZeroAmount();
    error ArrayLengthMismatch();
    error EmptyArray();
    error BatchTooLarge(uint256 provided, uint256 max);
    error InsufficientRewardBalance(uint256 required, uint256 available);
    error InsufficientUsdtBalance(uint256 required, uint256 available);
    error CampaignAlreadyFunded(string campaignId);
    error CannotRecoverManagedToken(address token);
    error SameTokenAddresses();

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Deploys the SocialFiTreasury contract.
     * @param _usdtToken     Address of the USDT ERC20 token.
     * @param _rewardToken   Address of the platform's native reward ERC20 token.
     * @param _admin         Address granted DEFAULT_ADMIN_ROLE.
     * @param _distributor   Address granted DISTRIBUTOR_ROLE (backend hot wallet).
     * @param _maxBatchSize  Initial max recipients per batch distribution.
     *
     * @dev Both token addresses are set as `immutable` to save gas on every read.
     *      The admin can later grant/revoke DISTRIBUTOR_ROLE to rotate the hot wallet.
     */
    constructor(
        address _usdtToken,
        address _rewardToken,
        address _admin,
        address _distributor,
        uint256 _maxBatchSize
    ) {
        if (_usdtToken == address(0)) revert ZeroAddress();
        if (_rewardToken == address(0)) revert ZeroAddress();
        if (_admin == address(0)) revert ZeroAddress();
        if (_distributor == address(0)) revert ZeroAddress();
        if (_usdtToken == _rewardToken) revert SameTokenAddresses();

        usdtToken = IERC20(_usdtToken);
        rewardToken = IERC20(_rewardToken);
        maxBatchSize = _maxBatchSize > 0 ? _maxBatchSize : 200;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(DISTRIBUTOR_ROLE, _distributor);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE 1: MERCHANT USDT DEPOSITS (Crypto Ad Payments)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Merchants call this to deposit USDT and fund an ad campaign.
     *         The backend listens for the `CampaignFunded` event to activate
     *         the campaign automatically (analogous to the Stripe webhook flow).
     *
     * @param amount     USDT amount to deposit (in token decimals, e.g. 6 for USDT).
     * @param campaignId Off-chain campaign ID from the backend database.
     *
     * @dev Security:
     *      - ReentrancyGuard prevents re-entrancy during the safeTransferFrom call.
     *      - SafeERC20 handles USDT's non-standard return value.
     *      - campaignDeposits mapping prevents double-funding the same campaign.
     *      - Anyone can call this (merchants are regular EOAs), but the campaignId
     *        must match a valid campaign in the backend to trigger activation.
     */
    function depositUSDT(
        uint256 amount,
        string calldata campaignId
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (bytes(campaignId).length == 0) revert EmptyArray();
        if (campaignDeposits[campaignId] > 0) revert CampaignAlreadyFunded(campaignId);

        // Record deposit before external call (checks-effects-interactions)
        campaignDeposits[campaignId] = amount;

        // Gas: cache state update
        unchecked {
            totalUsdtDeposited += amount;
        }

        // Transfer USDT from merchant to this contract
        usdtToken.safeTransferFrom(msg.sender, address(this), amount);

        emit CampaignFunded(msg.sender, amount, campaignId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE 2: BATCH REWARD DISTRIBUTION (Gas Optimized)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Distributes reward tokens to multiple users in a single transaction.
     *         Called periodically by the backend service to settle off-chain balances.
     *
     * @param recipients Array of user wallet addresses to receive rewards.
     * @param amounts    Array of reward token amounts (must match recipients length).
     *
     * @dev Gas optimizations:
     *      - `calldata` arrays avoid memory copy overhead.
     *      - Pre-flight balance check prevents partial batch failures.
     *      - `unchecked` block for the loop counter (cannot overflow with maxBatchSize cap).
     *      - Single SLOAD for rewardToken (immutable) and contract balance.
     *      - Minimal storage writes: only totalRewardsDistributed updated once after loop.
     *
     * @dev Security:
     *      - DISTRIBUTOR_ROLE required (backend hot wallet only).
     *      - ReentrancyGuard prevents re-entrancy if a recipient is a contract.
     *      - maxBatchSize cap prevents out-of-gas griefing.
     *      - Pre-flight total calculation ensures the entire batch succeeds or reverts.
     */
    function batchDistributeRewards(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyRole(DISTRIBUTOR_ROLE) nonReentrant whenNotPaused {
        uint256 len = recipients.length;

        if (len == 0) revert EmptyArray();
        if (len != amounts.length) revert ArrayLengthMismatch();
        if (len > maxBatchSize) revert BatchTooLarge(len, maxBatchSize);

        // Pre-flight: calculate total amount needed and validate inputs
        uint256 totalAmount;
        for (uint256 i; i < len; ) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();
            totalAmount += amounts[i];
            unchecked { ++i; }
        }

        // Verify contract holds enough reward tokens
        uint256 available = rewardToken.balanceOf(address(this));
        if (available < totalAmount) {
            revert InsufficientRewardBalance(totalAmount, available);
        }

        // Execute transfers
        // Gas: cache the immutable IERC20 reference (already in memory via immutable)
        IERC20 _rewardToken = rewardToken;
        for (uint256 i; i < len; ) {
            _rewardToken.safeTransfer(recipients[i], amounts[i]);
            unchecked { ++i; }
        }

        // Single storage write for the running total
        unchecked {
            totalRewardsDistributed += totalAmount;
        }

        emit RewardsDistributed(len, totalAmount);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Admin or anyone can fund the reward pool by transferring
     *         reward tokens into this contract.
     * @param amount The reward token amount to deposit.
     *
     * @dev This is a convenience function that transfers tokens from the
     *      caller to the contract and updates the funded counter.
     *      The admin could also just `transfer()` directly, but this
     *      provides event tracking.
     */
    function fundRewardPool(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        unchecked {
            totalRewardsFunded += amount;
        }

        rewardToken.safeTransferFrom(msg.sender, address(this), amount);

        emit RewardPoolFunded(msg.sender, amount);
    }

    /**
     * @notice Admin withdraws collected USDT (platform revenue from ad deposits).
     * @param to     Destination address for the USDT.
     * @param amount USDT amount to withdraw.
     *
     * @dev Only DEFAULT_ADMIN_ROLE can call this.
     *      Uses checks-effects-interactions pattern.
     */
    function withdrawUSDT(
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 available = usdtToken.balanceOf(address(this));
        if (available < amount) {
            revert InsufficientUsdtBalance(amount, available);
        }

        unchecked {
            totalUsdtWithdrawn += amount;
        }

        usdtToken.safeTransfer(to, amount);

        emit UsdtWithdrawn(to, amount);
    }

    /**
     * @notice Recovers ERC20 tokens accidentally sent to this contract.
     * @param token The ERC20 token address to recover.
     * @param to    Destination address.
     * @param amount Amount to recover.
     *
     * @dev CANNOT recover usdtToken or rewardToken — those are managed assets.
     *      Use withdrawUSDT() for USDT and the reward pool is distributed via
     *      batchDistributeRewards(). This prevents admin from rug-pulling
     *      managed funds through this backdoor.
     */
    function recoverToken(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (token == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (token == address(usdtToken) || token == address(rewardToken)) {
            revert CannotRecoverManagedToken(token);
        }

        IERC20(token).safeTransfer(to, amount);

        emit TokenRecovered(token, to, amount);
    }

    /**
     * @notice Updates the maximum batch size for reward distributions.
     * @param _maxBatchSize New maximum number of recipients per batch.
     *
     * @dev Allows the admin to tune the gas limit per batch call.
     *      A typical safe range is 100–500 depending on the chain's block gas limit.
     */
    function setMaxBatchSize(
        uint256 _maxBatchSize
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_maxBatchSize == 0) revert ZeroAmount();

        uint256 oldSize = maxBatchSize;
        maxBatchSize = _maxBatchSize;

        emit MaxBatchSizeUpdated(oldSize, _maxBatchSize);
    }

    /**
     * @notice Pauses all deposit and distribution operations.
     * @dev Emergency circuit-breaker. Only admin can pause.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses all operations.
     * @dev Only admin can unpause.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Returns the current reward token balance available for distribution.
     * @return The contract's reward token balance.
     */
    function rewardPoolBalance() external view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }

    /**
     * @notice Returns the current USDT balance held in the contract.
     * @return The contract's USDT balance.
     */
    function usdtBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }

    /**
     * @notice Returns the USDT amount deposited for a specific campaign.
     * @param campaignId The off-chain campaign identifier.
     * @return The deposited USDT amount (0 if not funded).
     */
    function getCampaignDeposit(
        string calldata campaignId
    ) external view returns (uint256) {
        return campaignDeposits[campaignId];
    }

    /**
     * @notice Prevents the contract from receiving raw ETH/MATIC.
     * @dev This contract only handles ERC20 tokens.
     */
    receive() external payable {
        revert("SocialFiTreasury: ETH not accepted");
    }
}
