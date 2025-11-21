import { getDocumensoBaseUrl, getDocumensoApiToken } from "./env";

export type DocumensoRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

export type DocumensoClient = {
  request: <T = unknown>(
    path: string,
    options?: DocumensoRequestOptions,
  ) => Promise<T>;
};

class DocumensoError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "DocumensoError";
  }
}

/**
 * Creates a Documenso API client with authentication headers and base URL handling.
 * Throws DocumensoError on non-2xx responses.
 */
export function getDocumensoClient(): DocumensoClient {
  const baseUrl = getDocumensoBaseUrl();
  const apiToken = getDocumensoApiToken();

  if (!apiToken) {
    throw new Error(
      "DOCUMENSO_API_TOKEN is not set. Cannot create Documenso client.",
    );
  }

  return {
    async request<T = unknown>(
      path: string,
      options: DocumensoRequestOptions = {},
    ): Promise<T> {
      const { method = "GET", body, headers = {} } = options;

      // Ensure path starts with /
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const url = `${baseUrl}${normalizedPath}`;

      // Documenso API requires Authorization header to be the raw API key (no Bearer prefix)
      // Format: Authorization: api_xxxxxxxxxxxxxxxx
      const requestHeaders: Record<string, string> = {
        Authorization: apiToken,
        "Content-Type": "application/json",
        ...headers,
      };

      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
      };

      if (body && method !== "GET" && method !== "DELETE") {
        fetchOptions.body = JSON.stringify(body);
      }

      try {
        const response = await fetch(url, fetchOptions);

        let responseData: unknown;
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        if (!response.ok) {
          const errorMessage =
            typeof responseData === "object" &&
            responseData !== null &&
            "error" in responseData &&
            typeof (responseData as { error: unknown }).error === "string"
              ? (responseData as { error: string }).error
              : `Documenso API error: ${response.status} ${response.statusText}`;

          throw new DocumensoError(
            errorMessage,
            response.status,
            responseData,
          );
        }

        return responseData as T;
      } catch (error) {
        if (error instanceof DocumensoError) {
          throw error;
        }
        if (error instanceof Error) {
          throw new DocumensoError(
            `Network error: ${error.message}`,
            0,
            error,
          );
        }
        throw new DocumensoError("Unknown error", 0, error);
      }
    },
  };
}

