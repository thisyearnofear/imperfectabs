import { ethers } from "ethers";

// Network configurations matching your bridge script
const NETWORK_CONFIG = {
  polygon: {
    name: "Polygon",
    rpc: "https://polygon-rpc.com",
    chainId: 137,
    fitnessContract: "0xc783d6E12560dc251F5067A62426A5f3b45b6888",
    icon: "🟣",
    color: "#8247E5",
  },
  base: {
    name: "Base",
    rpc: "https://mainnet.base.org",
    chainId: 8453,
    fitnessContract: "0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B",
    icon: "🔵",
    color: "#0052FF",
  },
  celo: {
    name: "Celo",
    rpc: "https://forno.celo.org",
    chainId: 42220,
    fitnessContract: "0xB0cbC7325EbC744CcB14211CA74C5a764928F273",
    icon: "🟡",
    color: "#FCFF52",
  },
  monad: {
    name: "Monad",
    rpc: "https://testnet-rpc.monad.xyz",
    chainId: 41454,
    fitnessContract: "0x653d41Fba630381aA44d8598a4b35Ce257924d65",
    icon: "⚫",
    color: "#000000",
  },
};

// Fitness contract ABI for reading scores
const FITNESS_ABI = [
  "function getUserScore(address user) external view returns (address userAddr, uint256 pushups, uint256 squats, uint256 timestamp)",
  "function getUserScoreSafe(address user) external view returns (address userAddr, uint256 pushups, uint256 squats, uint256 timestamp, bool exists)",
];

export interface CrossChainScore {
  network: string;
  networkName: string;
  icon: string;
  color: string;
  pushups: number;
  squats: number;
  total: number;
  timestamp: number;
  exists: boolean;
  error?: string;
}

export interface CrossChainData {
  polygonScore: number;
  baseScore: number;
  celoScore: number;
  monadScore: number;
  activeChains: number;
  multiChainBonus: number;
  totalCrossChain: number;
  lastUpdated: number;
  scoreBreakdown: CrossChainScore[];
}

class CrossChainService {
  private cache: Map<string, { data: CrossChainData; timestamp: number }> =
    new Map();
  private readonly CACHE_DURATION = 3 * 60 * 1000; // 3 minutes for frequent updates
  private readonly LONG_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for inactive users
  private readonly BATCH_SIZE = 3; // Smaller batches for top users
  private readonly MAX_CACHE_SIZE = 20; // Prevent memory bloat
  private fetchPromises: Map<string, Promise<CrossChainData | null>> =
    new Map(); // Prevent duplicate requests

  /**
   * Get cross-chain data for a specific user
   */
  async getUserCrossChainData(
    userAddress: string
  ): Promise<CrossChainData | null> {
    const userKey = userAddress.toLowerCase();

    // Check cache first with intelligent expiration
    const cached = this.cache.get(userKey);
    if (cached) {
      const isActive = cached.data.activeChains > 1;
      const cacheAge = Date.now() - cached.timestamp;
      const maxAge = isActive ? this.CACHE_DURATION : this.LONG_CACHE_DURATION;

      if (cacheAge < maxAge) {
        return cached.data;
      }
    }

    // Prevent duplicate requests for same user
    if (this.fetchPromises.has(userKey)) {
      return this.fetchPromises.get(userKey)!;
    }

    // Create fetch promise
    const fetchPromise = this.doFetchUserData(userAddress);
    this.fetchPromises.set(userKey, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      // Clean up promise
      this.fetchPromises.delete(userKey);
    }
  }

  private async doFetchUserData(
    userAddress: string
  ): Promise<CrossChainData | null> {
    try {
      const scores = await this.fetchUserScoresFromAllChains(userAddress);
      const crossChainData = this.processCrossChainData(scores);

      // Manage cache size
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        this.evictOldestCacheEntry();
      }

      // Cache the result
      this.cache.set(userAddress.toLowerCase(), {
        data: crossChainData,
        timestamp: Date.now(),
      });

      return crossChainData;
    } catch (error) {
      console.warn(
        `Failed to fetch cross-chain data for ${userAddress}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get cross-chain data for multiple users efficiently
   */
  async getBatchCrossChainData(
    userAddresses: string[]
  ): Promise<Map<string, CrossChainData>> {
    const results = new Map<string, CrossChainData>();

    // Prioritize top users and filter for cache hits first
    const sortedAddresses = [...userAddresses];
    const cacheHits: string[] = [];
    const cacheMisses: string[] = [];

    sortedAddresses.forEach((address) => {
      const cached = this.cache.get(address.toLowerCase());
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        cacheHits.push(address);
        results.set(address.toLowerCase(), cached.data);
      } else {
        cacheMisses.push(address);
      }
    });

    console.log(
      `📊 Cache performance: ${cacheHits.length} hits, ${cacheMisses.length} misses`
    );

    // Only fetch missing data
    if (cacheMisses.length > 0) {
      // Process cache misses in smaller batches for better performance
      for (let i = 0; i < cacheMisses.length; i += this.BATCH_SIZE) {
        const batch = cacheMisses.slice(i, i + this.BATCH_SIZE);

        const batchPromises = batch.map(async (address) => {
          const data = await this.getUserCrossChainData(address);
          if (data) {
            results.set(address.toLowerCase(), data);
          }
        });

        await Promise.all(batchPromises);

        // Small delay between batches to be gentle on RPCs
        if (i + this.BATCH_SIZE < cacheMisses.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }

    return results;
  }

  /**
   * Fetch user scores from all chains
   */
  private async fetchUserScoresFromAllChains(
    userAddress: string
  ): Promise<CrossChainScore[]> {
    const promises = Object.entries(NETWORK_CONFIG).map(
      async ([networkKey, config]) => {
        try {
          const provider = new ethers.providers.JsonRpcProvider(config.rpc);
          const contract = new ethers.Contract(
            config.fitnessContract,
            FITNESS_ABI,
            provider
          );

          let score: CrossChainScore = {
            network: networkKey,
            networkName: config.name,
            icon: config.icon,
            color: config.color,
            pushups: 0,
            squats: 0,
            total: 0,
            timestamp: 0,
            exists: false,
          };

          try {
            // Try safe method first
            const result = await contract.getUserScoreSafe(userAddress);
            if (result.exists) {
              score = {
                ...score,
                pushups: result.pushups.toNumber(),
                squats: result.squats.toNumber(),
                total: result.pushups.add(result.squats).toNumber(),
                timestamp: result.timestamp.toNumber(),
                exists: true,
              };
            }
          } catch {
            // Fallback to basic method
            try {
              const result = await contract.getUserScore(userAddress);
              score = {
                ...score,
                pushups: result.pushups.toNumber(),
                squats: result.squats.toNumber(),
                total: result.pushups.add(result.squats).toNumber(),
                timestamp: result.timestamp.toNumber(),
                exists: result.pushups.gt(0) || result.squats.gt(0),
              };
            } catch (fallbackError) {
              score.error = (fallbackError as Error).message;
            }
          }

          return score;
        } catch (error) {
          return {
            network: networkKey,
            networkName: config.name,
            icon: config.icon,
            color: config.color,
            pushups: 0,
            squats: 0,
            total: 0,
            timestamp: 0,
            exists: false,
            error: (error as Error).message,
          };
        }
      }
    );

    return Promise.all(promises);
  }

  /**
   * Process raw scores into cross-chain data structure
   */
  private processCrossChainData(scores: CrossChainScore[]): CrossChainData {
    const scoreMap = scores.reduce((acc, score) => {
      acc[score.network] = score.total;
      return acc;
    }, {} as Record<string, number>);

    const activeChains = scores.filter((s) => s.exists && s.total > 0).length;
    const totalCrossChain = scores.reduce((sum, s) => sum + s.total, 0);

    // Calculate multi-chain bonus (5% per additional chain)
    const multiChainBonus = activeChains > 1 ? (activeChains - 1) * 5 : 0;

    return {
      polygonScore: scoreMap.polygon || 0,
      baseScore: scoreMap.base || 0,
      celoScore: scoreMap.celo || 0,
      monadScore: scoreMap.monad || 0,
      activeChains,
      multiChainBonus,
      totalCrossChain,
      lastUpdated: Date.now(),
      scoreBreakdown: scores.filter((s) => s.exists && s.total > 0),
    };
  }

  /**
   * Clear cache for specific user or all users
   */
  private evictOldestCacheEntry() {
    let oldestKey = "";
    let oldestTime = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ Evicted old cache entry for ${oldestKey}`);
    }
  }

  clearCache(userAddress?: string) {
    if (userAddress) {
      this.cache.delete(userAddress.toLowerCase());
      this.fetchPromises.delete(userAddress.toLowerCase());
    } else {
      this.cache.clear();
      this.fetchPromises.clear();
    }
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats() {
    const now = Date.now();
    const fresh = Array.from(this.cache.entries()).filter(
      ([, value]) => now - value.timestamp < this.CACHE_DURATION
    ).length;

    return {
      size: this.cache.size,
      fresh,
      stale: this.cache.size - fresh,
      activeFetches: this.fetchPromises.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Check if user has multi-chain activity
   */
  async hasMultiChainActivity(userAddress: string): Promise<boolean> {
    const data = await this.getUserCrossChainData(userAddress);
    return data ? data.activeChains > 1 : false;
  }
}

// Export singleton instance
export const crossChainService = new CrossChainService();

// Export network config for use in components
export { NETWORK_CONFIG };
