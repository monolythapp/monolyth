// RAG Foundations v1 – helpers (stubs)
//
// This file defines the public interface for RAG in Monolyth but intentionally
// avoids hard-wiring any particular DB client or OpenAI call just yet.
//
// Week 9 goal:
//  - Define the shape of RAG helpers that Builder / Mono can call.
//  - Keep implementations as safe no-ops or minimal stubs for now.

import type {
  RagIndexOptions,
  RagQueryOptions,
  RagResult,
  RagSearchContext,
} from "./types";

const DEFAULT_RAG_BACKEND: RagSearchContext = {
  backend: "pgvector",
};

/**
 * indexDocument
 *
 * High-level entry point to (re)index a document into vault_embeddings.
 *
 * In Week 9 this is a stub: callers can wire this up, but implementation will
 * be filled in once we stabilise how we:
 *  - fetch Vault document content,
 *  - call OpenAI (or other) embeddings,
 *  - persist chunks into Supabase.
 */
export async function indexDocument(
  documentId: string,
  options: RagIndexOptions = {},
  context: RagSearchContext = DEFAULT_RAG_BACKEND,
): Promise<void> {
  if (!documentId) {
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[rag] indexDocument (stub)", {
      documentId,
      options,
      context,
    });
  }

  // TODO: implement pgvector-backed indexing:
  //  - load document content from Vault
  //  - chunk content
  //  - embed chunks
  //  - upsert into vault_embeddings
}

/**
 * deleteEmbeddingsForDocument
 *
 * Convenience helper to wipe embeddings for a given document_id.
 * Again, this is a stub in Week 9 – safe to call but does nothing.
 */
export async function deleteEmbeddingsForDocument(
  documentId: string,
  context: RagSearchContext = DEFAULT_RAG_BACKEND,
): Promise<void> {
  if (!documentId) {
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[rag] deleteEmbeddingsForDocument (stub)", {
      documentId,
      context,
    });
  }

  // TODO: implement delete from vault_embeddings where document_id = ...
}

/**
 * searchRag
 *
 * Primary entry for Mono / Builder when they want to pull in relevant chunks
 * for a user query. For Week 9 this returns an empty array but logs usage in
 * non-production so we can see call sites during development.
 */
export async function searchRag(
  query: string,
  options: RagQueryOptions = {},
  context: RagSearchContext = DEFAULT_RAG_BACKEND,
): Promise<RagResult[]> {
  if (!query.trim()) {
    return [];
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[rag] searchRag (stub)", {
      query,
      options,
      context,
    });
  }

  // TODO: implement pgvector-backed similarity search:
  //  - embed query
  //  - run vector search against vault_embeddings
  //  - return ranked RagResult[]

  return [];
}

