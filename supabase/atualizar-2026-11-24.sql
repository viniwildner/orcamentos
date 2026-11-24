-- Atualização de 24/11/2026: lixeira e novo fluxo de aprovação.
-- Rode uma vez no Supabase: SQL Editor > New query > cole tudo > Run.

create or replace function public.get_proposta(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'orcamento', (o.dados - 'interno' - 'historico') || jsonb_build_object('id', o.id, 'status', o.status),
    'config', (select c.dados from configuracoes c where c.id = 1)
  )
  from orcamentos o
  where o.id = p_id and o.status <> 'rascunho' and not (o.dados ? 'excluidoEm');
$$;

create or replace function public.registrar_escolha(p_id uuid, p_escolha jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  limpo jsonb;
begin
  -- O cliente não aprova sozinho: ele envia um pedido de aprovação, e você confirma no painel.
  -- Depois do pedido (ou da aprovação), as escolhas ficam travadas.
  limpo := jsonb_strip_nulls(jsonb_build_object(
    'pagamento', p_escolha -> 'pagamento',
    'opcionais', p_escolha -> 'opcionais',
    'pedidoEm', case when p_escolha ? 'pedidoEm' then to_jsonb(now()) end
  ));
  update orcamentos
     set dados = jsonb_set(
                   jsonb_set(dados, '{escolha}', coalesce(dados -> 'escolha', '{}'::jsonb) || limpo),
                   '{historico}',
                   coalesce(dados -> 'historico', '[]'::jsonb) || case
                     when status = 'enviado'
                       then jsonb_build_array(jsonb_build_object('status', 'visualizado', 'em', now(), 'por', 'cliente'))
                     else '[]'::jsonb end),
         status = case when status = 'enviado' then 'visualizado' else status end,
         atualizado_em = now()
   where id = p_id
     and status not in ('rascunho', 'recusado', 'aprovado')
     and not (dados ? 'excluidoEm')
     and not coalesce((dados -> 'escolha') ? 'pedidoEm', false);
end;
$$;
