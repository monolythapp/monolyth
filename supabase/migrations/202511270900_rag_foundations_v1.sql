-- RAG Foundations v1
-- Week 9 – embeddings table for Vault documents

begin;

-- Ensure pgvector is available (Supabase supports this extension).
create extension if not exists vector with schema public;

-- Simple embeddings table, one row per chunk.
-- We intentionally keep this generic and Vault-centric:
--  - document_id: points at vault_documents (or equivalent)
--  - chunk_id: caller-defined logical ID (string)
--  - content: the chunk text we embedded
--  - embedding: vector(1536) compatible with OpenAI-style embeddings

create table if not exists public.vault_embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  chunk_id text not null,
  content text not null,
  embedding public.vector(1536) not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Optional FK to vault_documents if it exists.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'vault_documents'
  ) then
    alter table public.vault_embeddings
      drop constraint if exists vault_embeddings_document_id_fkey,
      add constraint vault_embeddings_document_id_fkey
        foreign key (document_id) references public.vault_documents (id)
        on delete cascade;
  end if;
end $$;

-- Basic indexes: by document and by similarity.

create index if not exists idx_vault_embeddings_document
  on public.vault_embeddings (document_id);

-- Vector index for similarity search using cosine distance.
-- Note: ivfflat requires setting "lists" when populating; we only define
-- the index here. Tuning can happen later.
create index if not exists idx_vault_embeddings_embedding_ivfflat
  on public.vault_embeddings
  using ivfflat (embedding public.vector_cosine_ops);

commit;

