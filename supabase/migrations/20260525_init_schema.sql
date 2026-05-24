-- TradeGPT Database Schema
-- ===========================

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  plan text default 'free' check (plan in ('free', 'pro', 'enterprise')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Broker accounts (per user)
create table public.broker_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  broker_name text not null,
  mt5_login text not null,
  server text not null,
  metaapi_id text, -- MetaAPI account ID (null if simulator)
  status text default 'connected' check (status in ('connected', 'disconnected', 'connecting', 'error')),
  balance numeric(15,2) default 0,
  equity numeric(15,2) default 0,
  pnl numeric(15,2) default 0,
  is_active boolean default false, -- which broker is currently selected
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trades history (per user)
create table public.trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  broker_id uuid references public.broker_accounts(id) on delete set null,
  symbol text not null,
  action text not null check (action in ('BUY', 'SELL')),
  volume numeric(10,4) default 0.1,
  entry_price numeric(15,5),
  stop_loss numeric(15,5),
  take_profit numeric(15,5),
  close_price numeric(15,5),
  pnl numeric(15,2),
  status text default 'open' check (status in ('open', 'closed', 'cancelled', 'pending')),
  order_id text, -- MetaAPI / broker order ID
  confidence text,
  created_at timestamptz default now(),
  closed_at timestamptz
);

-- Chat sessions (per user)
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text default 'New Chat',
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS (Row Level Security) on all tables
alter table public.profiles enable row level security;
alter table public.broker_accounts enable row level security;
alter table public.trades enable row level security;
alter table public.chat_sessions enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can view own brokers" on public.broker_accounts
  for all using (auth.uid() = user_id);

create policy "Users can view own trades" on public.trades
  for all using (auth.uid() = user_id);

create policy "Users can view own chats" on public.chat_sessions
  for all using (auth.uid() = user_id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes for performance
create index idx_broker_accounts_user on public.broker_accounts(user_id);
create index idx_trades_user on public.trades(user_id);
create index idx_trades_broker on public.trades(broker_id);
create index idx_chat_sessions_user on public.chat_sessions(user_id);
