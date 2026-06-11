-- Supabase Database Schema for Melo (Multi-User Music App)
-- Execute this SQL script in your Supabase SQL Editor.

-- 1. Enable UUID Extension if not enabled
create extension if not exists "uuid-ossp";

-- 2. CREATE SONGS TABLE (Shared library)
create table public.songs (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    artist text not null,
    youtube_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Songs (Anyone can read, only admin can write)
alter table public.songs enable row level security;

-- 3. CREATE PUBLIC USERS PROFILE TABLE (links to auth.users)
create table public.users (
    id uuid references auth.users on delete cascade primary key,
    name text not null,
    email text not null,
    image_url text,
    role text default 'user' not null check (role in ('user', 'admin')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Users
alter table public.users enable row level security;

-- 4. Admin Role Helper Function to prevent recursion in policies
create or replace function public.is_admin()
returns boolean as $$
begin
  -- Search public.users directly (runs with security definer privileges to bypass RLS)
  return exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- RLS policies for Users table
create policy "Users can read their own profile or admins can read all" 
on public.users for select 
using (auth.uid() = id or public.is_admin());

create policy "Users can update their own profile" 
on public.users for update 
using (auth.uid() = id);

-- Trigger to sync auth.users with public.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, role, image_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New Listener'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    new.raw_user_meta_data->>'image_url'
  );
  
  -- Create default settings for the new user automatically
  insert into public.settings (user_id, theme, audio_quality, notifications)
  values (new.id, 'dark', 'high', true);
  
  return new;
end;
$$ language plpgsql security definer;

-- 5. CREATE PLAYLISTS TABLE
create table public.playlists (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    name text not null,
    cover_image text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Playlists (User can only read/write their own, admins can see all)
alter table public.playlists enable row level security;

create policy "Users can view their own playlists or admins can view all" 
on public.playlists for select 
using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert their own playlists" 
on public.playlists for insert 
to authenticated 
with check (auth.uid() = user_id);

create policy "Users can update their own playlists" 
on public.playlists for update 
to authenticated 
using (auth.uid() = user_id);

create policy "Users can delete their own playlists" 
on public.playlists for delete 
to authenticated 
using (auth.uid() = user_id);

-- 6. CREATE PLAYLIST SONGS TABLE
create table public.playlist_songs (
    id uuid default gen_random_uuid() primary key,
    playlist_id uuid references public.playlists(id) on delete cascade not null,
    song_id uuid references public.songs(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Playlist Songs
alter table public.playlist_songs enable row level security;

create policy "Users can view songs in their playlists or admins can view all" 
on public.playlist_songs for select 
using (
    exists (
        select 1 from public.playlists
        where playlists.id = playlist_songs.playlist_id
        and playlists.user_id = auth.uid()
    ) or public.is_admin()
);

create policy "Users can add songs to their playlists" 
on public.playlist_songs for insert 
to authenticated 
with check (
    exists (
        select 1 from public.playlists
        where playlists.id = playlist_songs.playlist_id
        and playlists.user_id = auth.uid()
    )
);

create policy "Users can remove songs from their playlists" 
on public.playlist_songs for delete 
to authenticated 
using (
    exists (
        select 1 from public.playlists
        where playlists.id = playlist_songs.playlist_id
        and playlists.user_id = auth.uid()
    )
);

-- 7. CREATE LIKED SONGS TABLE (FAVORITES)
create table public.liked_songs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    song_id uuid references public.songs(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, song_id)
);

-- Enable RLS for Liked Songs
alter table public.liked_songs enable row level security;

create policy "Users can view their own liked songs or admins can view all" 
on public.liked_songs for select 
using (auth.uid() = user_id or public.is_admin());

create policy "Users can like songs" 
on public.liked_songs for insert 
to authenticated 
with check (auth.uid() = user_id);

create policy "Users can unlike songs" 
on public.liked_songs for delete 
to authenticated 
using (auth.uid() = user_id);

-- 8. CREATE RECENTLY PLAYED TABLE
create table public.recently_played (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    song_id uuid references public.songs(id) on delete cascade not null,
    played_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Recently Played
alter table public.recently_played enable row level security;

create policy "Users can view their own recently played history or admins can view all" 
on public.recently_played for select 
using (auth.uid() = user_id or public.is_admin());

create policy "Users can record their recently played" 
on public.recently_played for insert 
to authenticated 
with check (auth.uid() = user_id);

-- 9. CREATE SEARCH HISTORY TABLE
create table public.search_history (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    query text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Search History
alter table public.search_history enable row level security;

create policy "Users can view their own search history or admins can view all" 
on public.search_history for select 
using (auth.uid() = user_id or public.is_admin());

create policy "Users can add search history records" 
on public.search_history for insert 
to authenticated 
with check (auth.uid() = user_id);

create policy "Users can delete their own search history" 
on public.search_history for delete 
to authenticated 
using (auth.uid() = user_id);

-- 10. CREATE SETTINGS TABLE
create table public.settings (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null unique,
    theme text default 'dark' not null,
    audio_quality text default 'high' not null,
    notifications boolean default true not null
);

-- Enable RLS for Settings
alter table public.settings enable row level security;

create policy "Users can view their own settings or admins can view all" 
on public.settings for select 
using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert settings" 
on public.settings for insert 
to authenticated 
with check (auth.uid() = user_id);

create policy "Users can update their own settings" 
on public.settings for update 
to authenticated 
using (auth.uid() = user_id);

-- 11. CREATE DOWNLOADS TABLE
create table public.downloads (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    song_id uuid references public.songs(id) on delete cascade not null,
    downloaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, song_id)
);

-- Enable RLS for Downloads
alter table public.downloads enable row level security;

create policy "Users can view their own downloads or admins can view all" 
on public.downloads for select 
using (auth.uid() = user_id or public.is_admin());

create policy "Users can add download records" 
on public.downloads for insert 
to authenticated 
with check (auth.uid() = user_id);

create policy "Users can delete download records" 
on public.downloads for delete 
to authenticated 
using (auth.uid() = user_id);

-- 12. CREATE LISTENING HISTORY TABLE
create table public.listening_history (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    song_id uuid references public.songs(id) on delete cascade not null,
    duration_seconds integer default 0 not null,
    listened_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Listening History
alter table public.listening_history enable row level security;

create policy "Users can view their own listening history or admins can view all" 
on public.listening_history for select 
using (auth.uid() = user_id or public.is_admin());

create policy "Users can record listening history" 
on public.listening_history for insert 
to authenticated 
with check (auth.uid() = user_id);

-- SONGS POLICIES
create policy "Songs are viewable by everyone" 
on public.songs for select 
using (true);

create policy "Songs are manageable by admins only" 
on public.songs for all 
using (public.is_admin());

-- Re-register auth trigger after function is declared
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed some default songs into the songs library
insert into public.songs (id, title, artist, youtube_url) values
('f5b5f25a-4933-4f0e-be4c-0c1598f828a1', 'After Hours', 'The Weeknd', 'https://www.youtube.com/watch?v=ygTZZpVNJ-Y'),
('f5b5f25a-4933-4f0e-be4c-0c1598f828a2', 'Blinding Lights', 'The Weeknd', 'https://www.youtube.com/watch?v=4NRXx6U8ABQ'),
('f5b5f25a-4933-4f0e-be4c-0c1598f828a3', 'Starboy', 'The Weeknd ft. Daft Punk', 'https://www.youtube.com/watch?v=34Na4j8AVgA'),
('f5b5f25a-4933-4f0e-be4c-0c1598f828a4', 'Midnight City', 'M83', 'https://www.youtube.com/watch?v=dX3kSGcoR4k'),
('f5b5f25a-4933-4f0e-be4c-0c1598f828a5', 'Intro', 'The xx', 'https://www.youtube.com/watch?v=sV4_wYldx7o'),
('f5b5f25a-4933-4f0e-be4c-0c1598f828a6', 'Sweater Weather', 'The Neighbourhood', 'https://www.youtube.com/watch?v=GCdwKhTtNNw'),
('f5b5f25a-4933-4f0e-be4c-0c1598f828a7', 'Royals', 'Lorde', 'https://www.youtube.com/watch?v=nlcIKh6s868'),
('f5b5f25a-4933-4f0e-be4c-0c1598f828a8', 'Perfect Places', 'Lorde', 'https://www.youtube.com/watch?v=H74tC4s8lJ0')
on conflict (id) do nothing;

-- 13. CREATE JAMS TABLE (Jam rooms)
create table if not exists public.jams (
    id uuid default gen_random_uuid() primary key,
    room_id text unique not null,
    password text not null,
    creator_id uuid references public.users(id) on delete cascade not null,
    current_song_id uuid references public.songs(id) on delete set null,
    current_song_progress integer default 0 not null,
    current_song_is_playing boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Jams
alter table public.jams enable row level security;

-- Jams policies:
-- Anyone authenticated can read/join a jam
create policy "Jams are viewable by authenticated users"
on public.jams for select
to authenticated
using (true);

-- Anyone authenticated can create a jam
create policy "Authenticated users can create jams"
on public.jams for insert
to authenticated
with check (auth.uid() = creator_id);

-- Only the creator can update the jam state
create policy "Only creator can update jam"
on public.jams for update
to authenticated
using (auth.uid() = creator_id);

-- Only the creator can delete the jam
create policy "Only creator can delete jam"
on public.jams for delete
to authenticated
using (auth.uid() = creator_id);

-- Enable Supabase Realtime for jams table if not already added
-- Note: We wrap in a do-block or run directly depending on permissions.
begin;
  -- Add table to publication if it exists
  alter publication supabase_realtime add table public.jams;
exception when others then
  -- Do nothing if publication doesn't exist or table is already added
end;
commit;

