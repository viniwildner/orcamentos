-- Wildner Design · Sistema de orçamentos
-- Rode este arquivo inteiro uma vez no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text,
  cliente text,
  tipo text default 'website',
  status text not null default 'rascunho',
  valor numeric default 0,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.configuracoes (
  id int primary key default 1,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

create index if not exists orcamentos_atualizado_idx on public.orcamentos (atualizado_em desc);

-- Segurança: só quem faz login no painel lê e altera os dados.
alter table public.orcamentos enable row level security;
alter table public.configuracoes enable row level security;

drop policy if exists "painel orcamentos" on public.orcamentos;
create policy "painel orcamentos" on public.orcamentos
  for all to authenticated using (true) with check (true);

drop policy if exists "painel configuracoes" on public.configuracoes;
create policy "painel configuracoes" on public.configuracoes
  for all to authenticated using (true) with check (true);

-- Permissões: o painel (usuário logado) lê e grava; visitante sem login não acessa as tabelas.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.orcamentos, public.configuracoes to authenticated;
revoke all on public.orcamentos, public.configuracoes from anon;

-- O cliente abre a proposta pelo link (id aleatório), sem login.
-- Estas funções devolvem só aquela proposta, e nunca rascunhos.
create or replace function public.get_proposta(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'orcamento', o.dados || jsonb_build_object('id', o.id, 'status', o.status),
    'config', (select c.dados from configuracoes c where c.id = 1)
  )
  from orcamentos o
  where o.id = p_id and o.status <> 'rascunho';
$$;

create or replace function public.marcar_visto(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update orcamentos
     set status = 'visualizado',
         dados = dados || jsonb_build_object('vistoEm', now()),
         atualizado_em = now()
   where id = p_id and status = 'enviado';
$$;

-- Guarda a forma de pagamento e os opcionais que o cliente marcou.
-- Quando vier "aprovadoEm", a proposta passa para aprovada.
create or replace function public.registrar_escolha(p_id uuid, p_escolha jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  limpo jsonb;
begin
  limpo := jsonb_strip_nulls(jsonb_build_object(
    'pagamento', p_escolha -> 'pagamento',
    'opcionais', p_escolha -> 'opcionais',
    'aprovadoEm', case when p_escolha ? 'aprovadoEm' then to_jsonb(now()) end
  ));
  update orcamentos
     set dados = jsonb_set(dados, '{escolha}', coalesce(dados -> 'escolha', '{}'::jsonb) || limpo),
         status = case when limpo ? 'aprovadoEm' then 'aprovado'
                       when status = 'enviado' then 'visualizado'
                       else status end,
         atualizado_em = now()
   where id = p_id and status not in ('rascunho', 'recusado');
end;
$$;

revoke all on function public.get_proposta(uuid) from public;
revoke all on function public.marcar_visto(uuid) from public;
revoke all on function public.registrar_escolha(uuid, jsonb) from public;
grant execute on function public.get_proposta(uuid) to anon, authenticated;
grant execute on function public.marcar_visto(uuid) to anon, authenticated;
grant execute on function public.registrar_escolha(uuid, jsonb) to anon, authenticated;
