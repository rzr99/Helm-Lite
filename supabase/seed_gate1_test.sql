-- GATE 1 test setup: assign roles to test users and plant rows
-- used to prove the security separation. Safe to re-run.

update public.users u set role = 'owner', full_name = 'Owner (Test)'
from auth.users a where a.id = u.id and a.email = 'owner@helm-lite.test';

update public.users u set role = 'team_lead', full_name = 'Team Lead (Test)'
from auth.users a where a.id = u.id and a.email = 'teamlead@helm-lite.test';

update public.users u set role = 'agent', full_name = 'Agent One (Test)'
from auth.users a where a.id = u.id and a.email = 'agent1@helm-lite.test';

update public.users u set role = 'agent', full_name = 'Agent Two (Test)'
from auth.users a where a.id = u.id and a.email = 'agent2@helm-lite.test';

insert into public.leads (agent_id, handle, source, stage, notes)
select id, '@lead_of_agent1', 'x', 'new', 'Test lead owned by agent 1'
from auth.users where email = 'agent1@helm-lite.test';

insert into public.leads (agent_id, handle, source, stage, notes)
select id, '@lead_of_agent2', 'x', 'new', 'Test lead owned by agent 2'
from auth.users where email = 'agent2@helm-lite.test';

insert into public.expenses (category, description, amount)
values ('proxy', 'Test expense - owner eyes only', 42.50);

insert into public.personas (persona_name, contact_email)
values ('Test Persona', 'persona@example.com');

select
  (select count(*) from public.users) as users,
  (select count(*) from public.leads) as leads,
  (select count(*) from public.expenses) as expenses,
  (select count(*) from public.personas) as personas;
