-- =============================================
-- Seazone Planejamento — Schema Supabase
-- Cole no SQL Editor do seu projeto Supabase
-- =============================================

-- Tabela de tarefas
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  membro       text not null,
  empreendimento text,
  tarefa       text not null,
  status       text default 'Não iniciada',
  "dataInicial" text,
  vencimento   text,
  "dataFinal"  text,
  duracao      text,
  observacao   text,
  created_at   timestamptz default now()
);

-- Tabela de resumos das dailys
create table if not exists dailies (
  id        uuid primary key default gen_random_uuid(),
  data      text not null,
  resumo    text,
  topicos   text,
  decisoes  text,
  acoes     text,
  fonte     text default 'Manual',
  created_at timestamptz default now()
);

-- Habilitar acesso público (leitura e escrita para usuários autenticados)
alter table tasks  enable row level security;
alter table dailies enable row level security;

create policy "Authenticated full access on tasks"
  on tasks for all
  using (auth.role() = 'authenticated');

create policy "Authenticated full access on dailies"
  on dailies for all
  using (auth.role() = 'authenticated');

-- Permitir o webhook do SeaNotes inserir sem autenticação (anon key)
create policy "Anon insert on dailies"
  on dailies for insert
  with check (true);
