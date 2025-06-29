"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ethers } from "ethers";
import { ImperfectAbsContract } from "../lib/contractIntegration";
import { useWallet } from "./WalletContext";

interface ContractContextType {
  contract: ethers.Contract | null;
  contractInstance: ImperfectAbsContract | null;
  isInitialized: boolean;
  error: string | null;
}

const ContractContext = createContext<ContractContextType>({
  contract: null,
  contractInstance: null,
  isInitialized: false,
  error: null,
});

export const useContract = () => {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error("useContract must be used within a ContractProvider");
  }
  return context;
};

interface ContractProviderProps {
  children: ReactNode;
}

export function ContractProvider({ children }: ContractProviderProps) {
  const { provider, isConnected } = useWallet();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [contractInstance, setContractInstance] =
    useState<ImperfectAbsContract | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeContract = async () => {
      if (!provider || !isConnected) {
        setContract(null);
        setContractInstance(null);
        setIsInitialized(false);
        setError(null);
        return;
      }

      try {
        setError(null);
        const instance = new ImperfectAbsContract();
        await instance.initialize(provider as ethers.providers.Web3Provider);

        // Get the raw contract for components that need it
        const rawContract = instance.getContract();

        setContractInstance(instance);
        setContract(rawContract);
        setIsInitialized(true);
      } catch (err) {
        console.error("Failed to initialize contract:", err);
        setError(
          err instanceof Error ? err.message : "Failed to initialize contract"
        );
        setContract(null);
        setContractInstance(null);
        setIsInitialized(false);
      }
    };

    initializeContract();
  }, [provider, isConnected]);

  const contextValue: ContractContextType = {
    contract,
    contractInstance,
    isInitialized,
    error,
  };

  return (
    <ContractContext.Provider value={contextValue}>
      {children}
    </ContractContext.Provider>
  );
}
