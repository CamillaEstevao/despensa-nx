-- Despensa NX v1.5 - Produto principal / agrupamento inteligente
-- Execute uma vez no SQL Editor do Supabase.
-- Não apaga nenhum produto nem lote existente.

alter table public.lar_produtos
  add column if not exists produto_base text;

update public.lar_produtos
set produto_base = nome
where produto_base is null or btrim(produto_base) = '';

create index if not exists lar_produtos_produto_base_idx
  on public.lar_produtos (produto_base);
