import { useState, useEffect, useCallback } from "react";
import { rewardsApi, type ApiReward } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export function useRewards() {
  const { isAuthenticated, refreshUser } = useAuth();
  const [balance, setBalance] = useState("0");
  const [totalEarned, setTotalEarned] = useState("0");
  const [pendingRewards, setPendingRewards] = useState(0);
  const [history, setHistory] = useState<ApiReward[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await rewardsApi.getBalance();
      setBalance(data.balance);
      setTotalEarned(data.totalEarned);
      setPendingRewards(data.pendingRewards);
    } catch {
      // silent fail — user might not be logged in
    }
  }, [isAuthenticated]);

  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const data = await rewardsApi.getHistory({ limit: 20 });
      setHistory(data.rewards);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Re-fetch balance after a reward is claimed
  const onRewardClaimed = useCallback(async (amount: string) => {
    setBalance((prev) =>
      (parseFloat(prev) + parseFloat(amount)).toFixed(8)
    );
    setTotalEarned((prev) =>
      (parseFloat(prev) + parseFloat(amount)).toFixed(8)
    );
    // Refresh from server to ensure accuracy
    await fetchBalance();
    await refreshUser();
  }, [fetchBalance, refreshUser]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBalance();
    } else {
      setBalance("0");
      setTotalEarned("0");
    }
  }, [isAuthenticated, fetchBalance]);

  return {
    balance,
    totalEarned,
    pendingRewards,
    history,
    isLoading,
    fetchBalance,
    fetchHistory,
    onRewardClaimed,
  };
}
