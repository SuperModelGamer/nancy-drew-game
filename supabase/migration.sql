-- Save slots table for cloud save functionality
-- Run this in your Supabase SQL Editor to set up the database

create table if not exists save_slots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  slot_number integer not null check (slot_number between 0 and 2),
  save_data jsonb not null,
  updated_at timestamptz default now() not null,
  unique (user_id, slot_number)
);

-- Enable Row Level Security
alter table save_slots enable row level security;

-- Users can only read/write their own save data
create policy "Users can manage own saves"
  on save_slots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast lookups by user
create index if not exists idx_save_slots_user_id on save_slots(user_id);
