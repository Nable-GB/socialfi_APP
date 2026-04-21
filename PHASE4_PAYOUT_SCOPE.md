# Phase 4 Payout Scope

## Current state

- Artist and fan revenue dashboards are already live.
- Revenue data exists for tracks, boosts, repost rewards, holdings, and royalty payout history.
- The product should not present these dashboards as fully automated profit-sharing infrastructure.

## What Phase 4 must deliver

1. Payout issuance pipeline
   - Move from dashboard-only reporting into explicit payout releases and settlement jobs.
   - Define when earnings become withdrawable versus pending.

2. Fan-dividend settlement
   - Convert Music NFT ownership snapshots into per-holder payout obligations.
   - Define the settlement source of truth for fractions, staking state, and recipient eligibility.

3. Operational controls
   - Add release states, retry handling, reconciliation, and admin auditability.
   - Keep a durable record of why a payout was released, blocked, retried, or failed.

4. User-facing trust model
   - Separate estimated earnings from settled payouts.
   - Show payout windows, release status, and exceptions clearly in product copy.

## Recommended execution sequence

1. Model payout releases and settlement jobs explicitly.
2. Lock the ownership snapshot and dividend calculation rules.
3. Implement admin-controlled payout generation and reconciliation.
4. Expose settled versus estimated values in dashboards.
5. Automate release scheduling only after reconciliation is reliable.

## Product alignment rule

Phase 4 remains a later execution stream. Until settlement automation exists, revenue dashboards should be positioned as visibility and planning tools, not finished dividend infrastructure.
