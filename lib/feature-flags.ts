"use client";

type FeatureFlagKey =
  | "FEATURE_PLAYBOOKS_ENGINE"
  | "FEATURE_SHARE_ACTIONS"
  | "FEATURE_CONNECTORS_EXTRA"
  | "FEATURE_VAULT_EXPERIMENTAL_ACTIONS";

const FLAG_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  FEATURE_PLAYBOOKS_ENGINE: false,
  FEATURE_SHARE_ACTIONS: false,
  FEATURE_CONNECTORS_EXTRA: false,
  FEATURE_VAULT_EXPERIMENTAL_ACTIONS: false,
};

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return undefined;
}

/**
 * Returns whether a feature flag is enabled, based on:
 * - NEXT_PUBLIC_<flag> env var (true/false/1/0/etc.)
 * - or a sane default if not set.
 */
export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  const envKey = `NEXT_PUBLIC_${key}`;
  const raw = process.env[envKey] as string | undefined;

  const parsed = parseBoolean(raw);
  if (parsed !== undefined) return parsed;

  return FLAG_DEFAULTS[key];
}

/**
 * Convenience helper for building small flag maps if needed.
 */
export function getFeatureFlags() {
  const keys: FeatureFlagKey[] = [
    "FEATURE_PLAYBOOKS_ENGINE",
    "FEATURE_SHARE_ACTIONS",
    "FEATURE_CONNECTORS_EXTRA",
    "FEATURE_VAULT_EXPERIMENTAL_ACTIONS",
  ];

  return keys.reduce(
    (acc, key) => {
      acc[key] = isFeatureEnabled(key);
      return acc;
    },
    {} as Record<FeatureFlagKey, boolean>,
  );
}

