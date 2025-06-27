"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  ensResolver,
  type ResolvedProfile,
  type ENSDisplayProps,
  type UseResolvedProfileReturn,
} from "../lib/ensResolver";

// React Hook for ENS resolution
export function useResolvedProfile(
  addressOrName: string | undefined,
): UseResolvedProfileReturn {
  const [profile, setProfile] = useState<ResolvedProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!addressOrName) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    ensResolver
      .resolveProfile(addressOrName)
      .then(setProfile)
      .catch((err) => {
        console.error("Profile resolution error:", err);
        setError(err.message);
        setProfile({
          address: addressOrName.startsWith("0x") ? addressOrName : "",
          displayName: addressOrName.startsWith("0x")
            ? `${addressOrName.slice(0, 6)}...${addressOrName.slice(-4)}`
            : addressOrName,
          avatar: null,
          description: null,
          platform: "unknown",
          isResolved: false,
        });
      })
      .finally(() => setIsLoading(false));
  }, [addressOrName]);

  return { profile, isLoading, error };
}

// Utility component for displaying resolved names
export function ENSDisplay({
  address,
  className = "",
  showAvatar = false,
  maxLength,
}: ENSDisplayProps) {
  const { profile, isLoading } = useResolvedProfile(address);

  if (isLoading) {
    return (
      <span className={`${className} animate-pulse`}>
        <span className="inline-block w-16 h-4 bg-gray-200 rounded"></span>
      </span>
    );
  }

  if (!profile) {
    const formattedAddress =
      address.length > 10
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : address;
    return <span className={className}>{formattedAddress}</span>;
  }

  let displayName = profile.displayName;
  if (maxLength && displayName.length > maxLength) {
    displayName = displayName.slice(0, maxLength) + "...";
  }

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      {showAvatar && profile.avatar && (
        <Image
          src={profile.avatar}
          alt={displayName}
          width={24}
          height={24}
          className="rounded-full border-2 border-gray-300"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <span title={profile.description || undefined} className="truncate">
        {displayName}
      </span>
      {!profile.isResolved && (
        <span className="text-xs text-gray-400" title="Unresolved name">
          (?)
        </span>
      )}
      {profile.platform !== "unknown" && profile.platform !== "ens" && (
        <span
          className="text-xs bg-blue-100 text-blue-800 px-1 rounded"
          title={`Resolved via ${profile.platform}`}
        >
          {profile.platform}
        </span>
      )}
    </span>
  );
}

// Profile card component for detailed display
interface ProfileCardProps {
  address: string;
  className?: string;
}

export function ProfileCard({ address, className = "" }: ProfileCardProps) {
  const { profile, isLoading, error } = useResolvedProfile(address);

  if (isLoading) {
    return (
      <div className={`p-4 border rounded-lg animate-pulse ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="space-y-2">
            <div className="w-24 h-4 bg-gray-200 rounded"></div>
            <div className="w-32 h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`p-4 border rounded-lg ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-gray-400 text-xs">?</span>
          </div>
          <div>
            <div className="font-mono text-sm text-gray-600">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
            <div className="text-xs text-gray-400">Unresolved</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border rounded-lg ${className}`}>
      <div className="flex items-center space-x-3">
        {profile.avatar ? (
          <Image
            src={profile.avatar}
            alt={profile.displayName}
            width={48}
            height={48}
            className="rounded-full border-2 border-gray-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23f3f4f6'/%3E%3Ctext x='24' y='30' text-anchor='middle' fill='%236b7280' font-family='Arial' font-size='14'%3E?%3C/text%3E%3C/svg%3E";
            }}
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {profile.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            {profile.displayName}
          </div>
          <div className="text-sm text-gray-500 font-mono">
            {profile.address && (
              <>
                {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
              </>
            )}
          </div>
          {profile.description && (
            <div className="text-xs text-gray-600 mt-1 truncate">
              {profile.description}
            </div>
          )}
          <div className="flex items-center space-x-2 mt-1">
            <span
              className={`text-xs px-2 py-1 rounded ${
                profile.isResolved
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {profile.platform}
            </span>
            {profile.isResolved && (
              <span className="text-xs text-green-600">✓ Resolved</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Batch resolver hook for multiple addresses
export function useBatchResolvedProfiles(addresses: string[]) {
  const [profiles, setProfiles] = useState<Map<string, ResolvedProfile>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!addresses.length) {
      setProfiles(new Map());
      return;
    }

    setIsLoading(true);
    setError(null);

    ensResolver
      .batchResolve(addresses)
      .then(setProfiles)
      .catch((err) => {
        console.error("Batch resolution error:", err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [addresses]);

  return { profiles, isLoading, error };
}
