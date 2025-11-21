export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set");
  }
  return url.replace(/\/+$/, "");
}

/**
 * Get Documenso base URL, defaulting to the hosted cloud URL if not set.
 */
export function getDocumensoBaseUrl(): string {
  const url = process.env.DOCUMENSO_BASE_URL || "https://app.documenso.com";
  return url.replace(/\/+$/, "");
}

/**
 * Get Documenso API token.
 * - In production: throws if not set.
 * - In development: logs a warning if not set but returns empty string.
 */
export function getDocumensoApiToken(): string {
  const token = process.env.DOCUMENSO_API_TOKEN;
  if (!token) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DOCUMENSO_API_TOKEN is required in production");
    }
    console.warn(
      "[documenso] DOCUMENSO_API_TOKEN is not set. Documenso features will not work.",
    );
    return "";
  }
  return token;
}

