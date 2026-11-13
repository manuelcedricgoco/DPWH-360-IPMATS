-- =============================================================================
-- DPWH 360° – 000_reset.sql
-- Phase 0: clean slate for the public schema.
--   * Backs up role assignments of existing users (restored in 001).
--   * Drops the old ad-hoc tables, functions and enum.
--   * Keeps auth.users and the ensure_rls event trigger (rls_auto_enable()).
--   * Enables pg_cron (needed for the daily flag check in 004).
-- Safe to run on a fresh project: every drop uses IF EXISTS.
-- =============================================================================

-- 1. Back up role assignments so the existing accounts keep their roles.
do $$
begin
  if to_regclass('public.profiles') is not null then
    drop table if exists public._profile_backup;
    create table public._profile_backup as
      select id, role::text as role, is_approved, full_name, office
      from public.profiles;
  end if;
end $$;

-- 2. Drop the auth trigger that depends on the old handle_new_user().
drop trigger if exists on_auth_user_created on auth.users;

-- 3. Drop old tables (CASCADE removes their policies, triggers and FKs).
drop table if exists public.projects              cascade;
drop table if exists public.contractors           cascade;
drop table if exists public.implementing_agencies cascade;
drop table if exists public.municipalities        cascade;
drop table if exists public.profiles              cascade;

-- 4. Drop old functions and types.
drop function if exists public.handle_new_user()                    cascade;
drop function if exists public.is_approved_role(variadic public.user_role[]) cascade;
drop function if exists public.set_updated_at()                     cascade;
drop type     if exists public.user_role                            cascade;

-- 5. Extensions.
create extension if not exists pg_cron;
