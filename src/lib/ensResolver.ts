// ENS Resolution Service using Web3.bio API
// Supports ENS, Basenames, Lens, Farcaster, and other naming services

interface Web3Profile {
  address: string;
  identity: string;
  platform: string;
  displayName: string;
  avatar: string | null;
  description: string | null;
}

interface ResolvedProfile {
  address: string;
  displayName: string;
  avatar: string | null;
  description: string | null;
  platform: string;
  isResolved: boolean;
}

class ENSResolver {
  private baseUrl = "https://api.web3.bio";
  private fallbackUrl = "https://ensdata.net";
  private cache: Map<string, ResolvedProfile> = new Map();
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Resolve an address or ENS name to a profile
   */
  async resolveProfile(addressOrName: string): Promise<ResolvedProfile> {
    // Check cache first
    const cached = this.cache.get(addressOrName.toLowerCase());
    if (cached) {
      return cached;
    }

    try {
      // Try Web3.bio first (supports multiple platforms)
      const profile = await this.resolveWithWeb3Bio(addressOrName);
      if (profile) {
        this.cache.set(addressOrName.toLowerCase(), profile);
        return profile;
      }

      // Fallback to ensdata.net for basic ENS resolution
      const fallbackProfile = await this.resolveWithEnsData(addressOrName);
      if (fallbackProfile) {
        this.cache.set(addressOrName.toLowerCase(), fallbackProfile);
        return fallbackProfile;
      }

      // Return unresolved profile
      return this.createUnresolvedProfile(addressOrName);
    } catch (error) {
      console.warn("ENS resolution failed:", error);
      return this.createUnresolvedProfile(addressOrName);
    }
  }

  /**
   * Resolve using Web3.bio API (primary method)
   */
  private async resolveWithWeb3Bio(
    identity: string,
  ): Promise<ResolvedProfile | null> {
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      if (this.apiKey) {
        headers["X-API-KEY"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/ns/${identity}`, {
        headers,
      });

      if (!response.ok) {
        return null;
      }

      const profiles: Web3Profile[] = await response.json();

      if (!profiles || profiles.length === 0) {
        return null;
      }

      // Prioritize ENS, then Basenames, then others
      const prioritizedProfile = this.prioritizeProfile(profiles);

      return {
        address: prioritizedProfile.address,
        displayName:
          prioritizedProfile.displayName || prioritizedProfile.identity,
        avatar: prioritizedProfile.avatar,
        description: prioritizedProfile.description,
        platform: prioritizedProfile.platform,
        isResolved: true,
      };
    } catch (error) {
      console.warn("Web3.bio resolution failed:", error);
      return null;
    }
  }

  /**
   * Fallback resolution using ensdata.net
   */
  private async resolveWithEnsData(
    identity: string,
  ): Promise<ResolvedProfile | null> {
    try {
      const response = await fetch(`${this.fallbackUrl}/${identity}`);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data || !data.ens) {
        return null;
      }

      return {
        address: data.address || identity,
        displayName: data.ens || data.display_name || identity,
        avatar: data.avatar || data.avatar_url || null,
        description: data.description || null,
        platform: "ens",
        isResolved: true,
      };
    } catch (error) {
      console.warn("ensdata.net resolution failed:", error);
      return null;
    }
  }

  /**
   * Prioritize profiles based on platform preference
   */
  private prioritizeProfile(profiles: Web3Profile[]): Web3Profile {
    const platformPriority = ["ens", "basenames", "farcaster", "lens"];

    for (const platform of platformPriority) {
      const profile = profiles.find((p) => p.platform === platform);
      if (profile) {
        return profile;
      }
    }

    // Return first profile if no priority match
    return profiles[0];
  }

  /**
   * Create an unresolved profile for display
   */
  private createUnresolvedProfile(addressOrName: string): ResolvedProfile {
    const isAddress = /^0x[a-fA-F0-9]{40}$/.test(addressOrName);

    return {
      address: isAddress ? addressOrName : "",
      displayName: isAddress
        ? this.formatAddress(addressOrName)
        : addressOrName,
      avatar: null,
      description: null,
      platform: "unknown",
      isResolved: false,
    };
  }

  /**
   * Format address for display
   */
  private formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Batch resolve multiple addresses/names
   */
  async batchResolve(
    identities: string[],
  ): Promise<Map<string, ResolvedProfile>> {
    const results = new Map<string, ResolvedProfile>();

    // Process in chunks to avoid rate limiting
    const chunkSize = 5;
    for (let i = 0; i < identities.length; i += chunkSize) {
      const chunk = identities.slice(i, i + chunkSize);
      const promises = chunk.map((identity) => this.resolveProfile(identity));

      try {
        const resolvedProfiles = await Promise.all(promises);
        chunk.forEach((identity, index) => {
          results.set(identity.toLowerCase(), resolvedProfiles[index]);
        });
      } catch (error) {
        console.warn("Batch resolution error:", error);
        // Add unresolved profiles for failed chunk
        chunk.forEach((identity) => {
          results.set(
            identity.toLowerCase(),
            this.createUnresolvedProfile(identity),
          );
        });
      }

      // Add delay between chunks to respect rate limits
      if (i + chunkSize < identities.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Get avatar URL with fallback
   */
  async getAvatar(addressOrName: string): Promise<string | null> {
    try {
      // Try direct avatar endpoint first
      const response = await fetch(
        `${this.fallbackUrl}/media/avatar/${addressOrName}`,
      );

      if (response.ok) {
        return response.url;
      }

      // Fallback to full profile resolution
      const profile = await this.resolveProfile(addressOrName);
      return profile.avatar;
    } catch (error) {
      console.warn("Avatar resolution failed:", error);
      return null;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Create singleton instance
const ensResolver = new ENSResolver(process.env.NEXT_PUBLIC_WEB3BIO_API_KEY);

// Utility functions for React components
export const useENSResolver = () => {
  return {
    resolveProfile: (addressOrName: string) =>
      ensResolver.resolveProfile(addressOrName),
    batchResolve: (identities: string[]) =>
      ensResolver.batchResolve(identities),
    getAvatar: (addressOrName: string) => ensResolver.getAvatar(addressOrName),
    formatAddress: (address: string) => ensResolver["formatAddress"](address),
  };
};

// Direct exports
export { ENSResolver, ensResolver };
export type { ResolvedProfile, Web3Profile };

// Export types and interfaces for React components
export interface ENSDisplayProps {
  address: string;
  className?: string;
  showAvatar?: boolean;
  maxLength?: number;
}

export interface UseResolvedProfileReturn {
  profile: ResolvedProfile | null;
  isLoading: boolean;
  error: string | null;
}
