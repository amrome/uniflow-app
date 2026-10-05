-- =====================================================================
-- Patch 08: Restaurant portal (the iPad at each campus restaurant).
--
--   * A restaurant account = the profile in restaurants.manager_id (column from 01). The app opens
--     the Restaurant portal at Staff login for that account. The admin links one with
--     `update restaurants set manager_id = ... where slug = ...` (see the demo block at the end).
--   * kitchen_orders(restaurant)      today's orders with their items, for the orders board
--   * set_order_status(order, status) moves an order along: pending -> preparing -> ready ->
--     completed, or cancels it before it is ready. Only the restaurant's manager or an admin.
--   * Managers already edit their restaurant (is_open, prep_min) and menu (is_available) through
--     the policies in 01. Those tables are added to realtime so students see changes at once.
--
-- Run once in the SQL Editor, AFTER 01-07. Safe to run again.
-- =====================================================================

create or replace function public.kitchen_orders(p_restaurant uuid)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  -- start of today in Riyadh
  v_since timestamptz := ((now() at time zone 'Asia/Riyadh')::date)::timestamp at time zone 'Asia/Riyadh';
begin
  if not (public.is_admin() or public.is_restaurant_manager(p_restaurant)) then
    raise exception 'Not allowed';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',             o.id,
      'order_number',   o.order_number,
      'status',         o.status,
      'customer_name',  o.customer_name,
      'total',          o.total,
      'pickup_time',    o.pickup_time,
      'created_at',     o.created_at,
      'payment_method', o.payment_method,
      'notes',          o.notes,
      'items', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'name_en',  m.name_en,
          'name_ar',  m.name_ar,
          'emoji',    m.emoji,
          'quantity', oi.quantity
        ) order by m.sort_order, m.name_en), '[]'::jsonb)
        from public.order_items oi
        join public.menu_items m on m.id = oi.menu_item_id
        where oi.order_id = o.id
      )
    ) order by o.created_at), '[]'::jsonb)
    from public.orders o
    where o.restaurant_id = p_restaurant
      and (o.status in ('pending','preparing','ready') or o.created_at >= v_since)
  );
end $$;

create or replace function public.set_order_status(p_order uuid, p_status public.order_status)
returns public.orders language plpgsql security invoker set search_path = public as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order;
  if not found then raise exception 'Order not found'; end if;
  if not (public.is_admin() or public.is_restaurant_manager(v_order.restaurant_id)) then
    raise exception 'Not allowed';
  end if;
  if not (
       (v_order.status = 'pending'   and p_status in ('preparing','cancelled'))
    or (v_order.status = 'preparing' and p_status in ('ready','cancelled'))
    or (v_order.status = 'ready'     and p_status = 'completed')
  ) then
    raise exception 'This order is already %', v_order.status;
  end if;
  update public.orders set status = p_status where id = p_order returning * into v_order;
  return v_order;
end $$;

revoke execute on function public.kitchen_orders(uuid) from public, anon;
revoke execute on function public.set_order_status(uuid, public.order_status) from public, anon;
grant  execute on function public.kitchen_orders(uuid) to authenticated;
grant  execute on function public.set_order_status(uuid, public.order_status) to authenticated;

-- Students see "sold out" / "closed" without reopening the app.
do $$
begin
  alter publication supabase_realtime add table public.menu_items;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.restaurants;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- Demo (optional): make an account the Kafton iPad. Put the email below and run again.
-- Create the user first in Authentication > Users (tick "Auto Confirm User").
-- With 07_demo_all_portals.sql the same demo account opens every portal, this one included.
-- ---------------------------------------------------------------------
do $$
declare
  v_email text := 'demo@yu.edu.sa';        -- <- the restaurant account
  v_slug  text := 'kafton';                -- <- its restaurant
  v_id    uuid;
begin
  select id into v_id from public.profiles where lower(email) = lower(v_email);
  if v_id is null then
    raise notice 'No profile for % yet: skipped the restaurant demo link.', v_email;
    return;
  end if;
  update public.restaurants set manager_id = null where manager_id = v_id and slug <> v_slug;
  update public.restaurants set manager_id = v_id where slug = v_slug;
end $$;
