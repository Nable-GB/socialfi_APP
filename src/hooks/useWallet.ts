import { useState, useCallback } from "react";
import { BrowserProvider } from "ethers";

// Sepolia chain config
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111
const SEPOLIA_CONFIG = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: "Sepolia Testnet",
  nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isSepolia: boolean;
  balance: string | null;
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);

  const hasMetaMask = typeof window !== "undefined" && !!window.ethereum;
  const isSepolia = chainId === 11155111;

  const getProvider = useCallback(() => {
    if (!window.ethereum) throw new Error("MetaMask not installed");
    return new BrowserProvider(window.ethereum);
  }, []);

  // Switch to Sepolia network
  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // Chain not added yet — add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [SEPOLIA_CONFIG],
        });
      } else {
        throw switchError;
      }
    }
  }, []);

  // Connect wallet
  const connect = useCallback(async (): Promise<string> => {
    if (!window.ethereum) throw new Error("Please install MetaMask to connect your wallet");

    setIsConnecting(true);
    try {
      // Request accounts
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please unlock MetaMask.");
      }

      const addr = accounts[0];
      setAddress(addr);

      // Get chain ID
      const chainHex: string = await window.ethereum.request({ method: "eth_chainId" });
      const chain = parseInt(chainHex, 16);
      setChainId(chain);

      // Switch to Sepolia if not already
      if (chain !== 11155111) {
        await switchToSepolia();
        setChainId(11155111);
      }

      // Get balance
      const provider = getProvider();
      const bal = await provider.getBalance(addr);
      const ethBal = parseFloat(bal.toString()) / 1e18;
      setBalance(ethBal.toFixed(4));

      return addr;
    } finally {
      setIsConnecting(false);
    }
  }, [getProvider, switchToSepolia]);

  // Sign a message (for SIWE)
  const signMessage = useCallback(async (message: string): Promise<string> => {
    const provider = getProvider();
    const signer = await provider.getSigner();
    return signer.signMessage(message);
  }, [getProvider]);

  // Disconnect (clear local state)
  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setBalance(null);
  }, []);

  return {
    address,
    chainId,
    isConnecting,
    isSepolia,
    balance,
    hasMetaMask,
    connect,
    signMessage,
    disconnect,
    switchToSepolia,
    getProvider,
  };
}
