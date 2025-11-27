// RAG Foundations v1 – types
//
// These types describe how we represent embedded chunks from Vault and how
// callers ask for / consume RAG results. The storage is defined in
// supabase/migrations/202511270900_rag_foundations_v1.sql.

export interface RagChunk {
  id?: string;
  documentId: string;
  chunkId: string;
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface RagQueryFilters {
  // Optional hard filter by document.
  documentId?: string;
  // Arbitrary metadata filters – interpreted by the backend.
  metadata?: Record<string, unknown>;
}

export interface RagQueryOptions {
  // Optional document-level filter / scoping.
  filters?: RagQueryFilters;
  // Max number of chunks to return (default will be set in implementation).
  limit?: number;
  // Optional similarity threshold (0–1 where 1 is identical).
  similarityThreshold?: number;
}

export interface RagResult {
  chunk: RagChunk;
  score: number;
}

export interface RagIndexOptions {
  // Optional override for chunking parameters when indexing.
  maxChunkSize?: number;
  overlap?: number;
  // Optional metadata to attach to all chunks for this document.
  metadata?: Record<string, unknown>;
}

// For future expansion if we support different backends (pgvector vs external).
export type RagBackend = "pgvector";

export interface RagSearchContext {
  backend: RagBackend;
}

