-- Digital Heroes — seed data. Run after schema.sql.

insert into charities (name, slug, category, short_description, description, is_featured, cover_url, logo_url)
values
  (
    'Saplings Trust', 'saplings-trust', 'Education',
    'Keeps 2,400 children in school across rural Maharashtra with fees, books and a daily meal.',
    E'Saplings Trust started in 2009 with one classroom in Ahmednagar district and a simple observation: children were dropping out not because families did not value school, but because the daily cost of attending outran the daily wage.\n\nThe trust covers fees, uniforms, textbooks and a midday meal for children between six and sixteen, and runs evening catch-up classes for those who have already fallen behind. Ninety-one percent of the children it supports finish secondary school.',
    true,
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&q=70',
    null
  ),
  (
    'Blue Coast Cleanup', 'blue-coast-cleanup', 'Environment',
    'Clears plastic from the Konkan coastline and pays local fishing families to do it.',
    E'Blue Coast Cleanup runs collection crews along 180 kilometres of the Konkan coast. Crews are drawn from fishing families whose catch has thinned, and are paid by weight for what they bring in.\n\nCollected plastic is sorted and sold to recyclers, with the proceeds returned to the crews. Since 2018 the programme has removed more than 900 tonnes from beaches and river mouths.',
    false,
    'https://images.unsplash.com/photo-1484291470158-b8f8d608850d?w=1200&q=70',
    null
  ),
  (
    'Second Innings', 'second-innings', 'Health',
    'Physiotherapy and mobility equipment for people recovering from stroke who cannot afford either.',
    E'Recovery after a stroke depends heavily on the first six months, and in most of India those months are unsupervised. Second Innings runs six outpatient physiotherapy centres and a loan library of walkers, wheelchairs and standing frames.\n\nEverything is free at the point of use. The charity also trains family members as home carers, because a physiotherapist twice a week is worth little without someone doing the work in between.',
    false,
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=70',
    null
  ),
  (
    'The Caddie Fund', 'the-caddie-fund', 'Sport',
    'Pensions, medical cover and off-season work for retired caddies at Indian golf clubs.',
    E'Caddies spend decades on courses that have no pension scheme for them. The Caddie Fund pays a monthly stipend to retired caddies over sixty, covers hospital admissions, and runs an off-season groundskeeping programme that keeps working caddies earning through the monsoon.\n\nIt was founded by four club members in Pune in 2016 and now supports caddies at nineteen clubs.',
    false,
    'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=1200&q=70',
    null
  ),
  (
    'Night Kitchen', 'night-kitchen', 'Hunger',
    'Hot meals after dark for hospital attendants, night-shift workers and rough sleepers.',
    E'Night Kitchen cooks between 10pm and 4am, when almost nothing else is open. Vans serve outside four government hospitals in Pune and Mumbai, where families of admitted patients often sleep on the pavement for weeks.\n\nNo one is asked for identification or a means test. Roughly 1,900 meals go out each night.',
    false,
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=70',
    null
  )
on conflict (slug) do nothing;

insert into charity_events (charity_id, title, event_date, location)
select id, 'Annual charity golf day', current_date + 45, 'Poona Club Golf Course'
from charities where slug = 'saplings-trust'
on conflict do nothing;

insert into charity_events (charity_id, title, event_date, location)
select id, 'School supplies drive', current_date + 12, 'Ahmednagar district'
from charities where slug = 'saplings-trust'
on conflict do nothing;

insert into charity_events (charity_id, title, event_date, location)
select id, 'Monsoon beach sweep', current_date + 21, 'Guhagar beach'
from charities where slug = 'blue-coast-cleanup'
on conflict do nothing;

insert into charity_events (charity_id, title, event_date, location)
select id, 'Caddie benefit fourball', current_date + 30, 'Bombay Presidency Golf Club'
from charities where slug = 'the-caddie-fund'
on conflict do nothing;

-- An open draw for the current month so the dashboard has something to show.
insert into draws (draw_month, draws_at, type, status)
values (
  date_trunc('month', current_date)::date,
  (date_trunc('month', current_date) + interval '1 month' - interval '4 hours'),
  'random',
  'draft'
)
on conflict (draw_month) do nothing;

-- Promote your own account to admin after signing up:
--   update profiles set role = 'admin' where email = 'you@example.com';
