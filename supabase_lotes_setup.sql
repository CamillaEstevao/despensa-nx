-- DESPENSA NX - ENTRADAS / LOTES
-- Execute UMA VEZ no SQL Editor do Supabase.
-- Preserva os produtos já cadastrados e apenas acrescenta os campos necessários.

alter table public.lar_produtos
  add column if not exists quantidade_original numeric(12,3),
  add column if not exists data_compra date,
  add column if not exists observacao text;

-- Os registros antigos passam a ser considerados a primeira entrada/lote do produto.
update public.lar_produtos
set quantidade_original = quantidade
where quantidade_original is null;

update public.lar_produtos
set data_compra = created_at::date
where data_compra is null;

alter table public.lar_produtos
  alter column quantidade_original set default 0;

create index if not exists lar_produtos_nome_idx on public.lar_produtos(user_id, lower(nome));
create index if not exists lar_produtos_data_compra_idx on public.lar_produtos(data_compra);

comment on column public.lar_produtos.quantidade is 'Quantidade atual/restante desta entrada/lote';
comment on column public.lar_produtos.quantidade_original is 'Quantidade originalmente comprada nesta entrada/lote';
comment on column public.lar_produtos.data_compra is 'Data em que esta entrada/lote foi comprada';
