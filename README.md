# Despensa NX

PWA doméstico para controle de produtos, compras, estoque e vencimentos.

## Versão 1.2

- Produtos agrupados por nome.
- Cada compra é uma entrada/lote independente.
- Marca e vencimento diferentes para o mesmo produto.
- Quantidade original e quantidade restante.
- Data da compra.
- Ações rápidas: Metade, -1 e Acabou.
- Lista de compras soma o estoque dos lotes compatíveis.
- Alertas de vencimento ignoram lotes já zerados.
- Push automático preparado para Vercel + Supabase.

## Atualização de banco

Quem já possui o Despensa NX deve executar `supabase_lotes_setup.sql` no SQL Editor do Supabase antes de publicar esta versão. O script preserva os registros existentes.
