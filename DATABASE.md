# Qualex CRM — Database Specification (for backend)

This is the schema the frontend expects. The whole UI talks to **one file** —
`lib/crm/service.ts` — whose async functions currently read/write `localStorage`.
Replace each function body with a real API/DB call against the tables below and
the UI keeps working unchanged.

- Engine assumed: **PostgreSQL** (works as-is on Supabase). Adjust types for
  MySQL if needed (`uuid`→`char(36)`, `timestamptz`→`datetime`, `jsonb`→`json`,
  `text[]`→a join table).
- All ids are UUIDs. All timestamps are UTC (`timestamptz` / ISO-8601 strings).
- Source of truth for field names/types: `lib/crm/types.ts`.

---

## Enum types

```sql
CREATE TYPE user_role        AS ENUM ('admin','telesales_supervisor','telesales_agent','direct_sales_supervisor','direct_sales_agent');
CREATE TYPE status_category  AS ENUM ('open','won','lost');
CREATE TYPE lead_channel     AS ENUM ('whatsapp','meta','website','app','call_center');
CREATE TYPE lead_stage       AS ENUM ('new','telesales_assigned','telesales_in_progress','qualified','unqualified',
                                      'ds_assigned','ds_in_progress','id_collected','credit_submitted','approved',
                                      'rejected','unreachable','retired','terminated');
CREATE TYPE disposition      AS ENUM ('qualified','unqualified','no_answer','terminated','retired');
CREATE TYPE financing_program AS ENUM ('new_car','used_car','collateral');
CREATE TYPE car_source       AS ENUM ('dealer','individual_c2c','undecided');
CREATE TYPE call_stage       AS ENUM ('telesales','direct_sales');
CREATE TYPE call_outcome     AS ENUM ('answered','no_answer','callback_scheduled');
CREATE TYPE history_type     AS ENUM ('created','status_change','assignment','comment','contact');
CREATE TYPE cadence          AS ENUM ('once','hourly','daily');
CREATE TYPE wa_direction     AS ENUM ('in','out');
```

---

## Tables

### teams
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| leader_id | uuid FK → users(id) NULL | team leader / supervisor |
| created_at | timestamptz DEFAULT now() | |

### users
(In Supabase this pairs with `auth.users`; `id` = the auth user id.)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| full_name | text NOT NULL | |
| email | text NOT NULL UNIQUE | login identifier |
| role | user_role NOT NULL | |
| title | text NULL | e.g. "Sales Agent" |
| team_id | uuid FK → teams(id) NULL | |
| is_active | boolean NOT NULL DEFAULT true | |
| created_at | timestamptz DEFAULT now() | |

### user_history
Activity log per user (the `history` array on the frontend user).
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users(id) ON DELETE CASCADE | |
| at | timestamptz DEFAULT now() | |
| action | text NOT NULL | e.g. "Role changed to admin" |

### projects
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| description | text | |
| is_active | boolean NOT NULL DEFAULT true | activate/deactivate |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

### project_sections
The tabbed detail sections of a project (General Details, Location, etc.).
*(Alternative: store as a `details jsonb` column on `projects` — array of `{title, body}`.)*
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects(id) ON DELETE CASCADE | |
| sort_order | int NOT NULL DEFAULT 0 | |
| title | text NOT NULL | |
| body | text | |

### lead_statuses
Admin-defined statuses shown in the sales portal.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| color | text NOT NULL DEFAULT '#6B7280' | hex |
| sort_order | int NOT NULL DEFAULT 0 | |
| category | status_category NOT NULL DEFAULT 'open' | for won/lost stats |
| is_default | boolean NOT NULL DEFAULT false | status new leads get |
| is_active | boolean NOT NULL DEFAULT true | |

### leads
The core table.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| phone | text NOT NULL | |
| phone_normalized | text | optional: E.164 for dedup (recommended, indexed) |
| facebook_url | text NULL | |
| channel | lead_channel NOT NULL DEFAULT 'call_center' | |
| project_id | uuid FK → projects(id) NULL | |
| status_id | uuid FK → lead_statuses(id) NULL | dynamic sub-status chip |
| assigned_user_id | uuid FK → users(id) NULL | **active owner** in current stage |
| stage | lead_stage NOT NULL DEFAULT 'new' | pipeline position |
| assigned_telesales_agent | uuid FK → users(id) NULL | |
| assigned_direct_sales_agent | uuid FK → users(id) NULL | |
| tele_disposition | disposition NULL | |
| ds_disposition | disposition NULL | |
| telesales_qualified_at | timestamptz NULL | |
| direct_sales_assigned_at | timestamptz NULL | |
| tele_sla_due_at | timestamptz NULL | |
| tele_sla_breached | boolean NOT NULL DEFAULT false | |
| ds_sla_due_at | timestamptz NULL | |
| ds_sla_breached | boolean NOT NULL DEFAULT false | |
| salary_bracket | text NULL | |
| down_payment_bracket | text NULL | |
| financing_program | financing_program NULL | |
| car_source | car_source NULL | |
| knows_specific_car | boolean NULL | |
| occupation | text NULL | |
| customer_national_id | text NULL | |
| requested_car_brand | text NULL | |
| requested_car_year | int NULL | |
| id_document_url | text NULL | link to stored ID doc |
| unqualification_reason | text NULL | |
| is_duplicate | boolean NOT NULL DEFAULT false | |
| duplicate_of | uuid FK → leads(id) NULL | |
| expire_note | text NULL | free label e.g. "You Locked It" |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

Indexes: `(assigned_user_id)`, `(assigned_telesales_agent)`, `(assigned_direct_sales_agent)`, `(stage)`, `(project_id)`, `(status_id)`, `(phone_normalized)`.

### lead_comments
Free-text comment thread per lead.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| lead_id | uuid FK → leads(id) ON DELETE CASCADE | |
| author_id | uuid FK → users(id) NULL | |
| body | text NOT NULL | |
| created_at | timestamptz DEFAULT now() | |

### lead_history
Timeline of everything that happened to a lead.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| lead_id | uuid FK → leads(id) ON DELETE CASCADE | |
| at | timestamptz DEFAULT now() | |
| actor_id | uuid FK → users(id) NULL | (frontend stores actor_name; store id + join, or keep name) |
| type | history_type NOT NULL | |
| detail | text NOT NULL | |

### call_attempts
Structured call logging. Enforce the rule: **3 consecutive `no_answer` in the same
`stage` ⇒ set the lead to `unreachable`**; a `callback_scheduled`/`answered` resets the streak.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| lead_id | uuid FK → leads(id) ON DELETE CASCADE | |
| agent_id | uuid FK → users(id) | |
| stage | call_stage NOT NULL | which pipeline phase |
| attempt_number | int NOT NULL CHECK (attempt_number >= 1) | increments per lead+stage |
| outcome | call_outcome NOT NULL | |
| callback_at | timestamptz NULL | when outcome = callback_scheduled |
| notes | text NULL | |
| called_at | timestamptz DEFAULT now() | |

### attendance
One row per user per day.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users(id) ON DELETE CASCADE | |
| date | date NOT NULL | |
| checked_in | boolean NOT NULL DEFAULT false | |
| checked_in_at | timestamptz NULL | |
| checked_out | boolean NOT NULL DEFAULT false | |
| checked_out_at | timestamptz NULL | |
| on_break | boolean NOT NULL DEFAULT false | |
| break_log | jsonb NOT NULL DEFAULT '[]' | array of `{started_at, ended_at}` |
| | | UNIQUE (user_id, date) |

### lead_reminders
Self-reminders an agent schedules on a lead.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users(id) ON DELETE CASCADE | who is reminded |
| lead_id | uuid FK → leads(id) ON DELETE CASCADE | |
| remind_at | timestamptz NOT NULL | |
| note | text NULL | |
| is_sent | boolean NOT NULL DEFAULT false | |

### distribution_schedules
Auto-distribute unassigned leads to agents on a schedule.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| project_id | uuid FK → projects(id) NULL | pool filter |
| source_status_id | uuid FK → lead_statuses(id) NULL | pool filter |
| per_user_count | int NOT NULL DEFAULT 10 | leads per user per run |
| cadence | cadence NOT NULL DEFAULT 'once' | |
| target_user_ids | uuid[] NOT NULL DEFAULT '{}' | *(or a join table `distribution_targets(schedule_id, user_id)`)* |
| is_active | boolean NOT NULL DEFAULT true | |
| last_run_at | timestamptz NULL | |
| created_at | timestamptz DEFAULT now() | |

### whatsapp_messages
Unified company-WhatsApp conversation per lead.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| lead_id | uuid FK → leads(id) ON DELETE CASCADE | |
| direction | wa_direction NOT NULL | 'in' (customer) / 'out' (company) |
| body | text NOT NULL | |
| at | timestamptz DEFAULT now() | |

---

## Frontend function → data mapping (`lib/crm/service.ts`)

| Function(s) | Table | Operation |
|---|---|---|
| listStatuses / createStatus / updateStatus / deleteStatus | lead_statuses | CRUD |
| listProjects / createProject / updateProject | projects (+ project_sections) | CRUD |
| listTeams / createTeam / updateTeam | teams | CRUD |
| listUsers / createUser / updateUser | users (+ user_history) | CRUD |
| listLeads(filter) | leads | SELECT + filters (status, project, assigned_user, date range, search) |
| createLead / importLeads | leads | INSERT (+ lead_history 'created') |
| updateLeadStatus | leads.status_id (+ lead_history) | UPDATE |
| assignTelesales / assignDirectSales / assignLead / moveLead | leads (assignment fields, stage, SLA) (+ lead_history) | UPDATE |
| qualifyLead | leads (qualification fields, stage='qualified') | UPDATE |
| setDisposition | leads (dispositions/stage) | UPDATE |
| recordCreditDecision | leads (stage approved/rejected) | UPDATE |
| logCallAttempt / listCallAttempts | call_attempts (+ leads.stage, 3-no-answer rule) | INSERT/SELECT |
| addComment / listComments | lead_comments | INSERT/SELECT |
| listHistory | lead_history | SELECT |
| getAttendance / listAttendance / checkIn / checkOut / startBreak / endBreak | attendance | UPSERT |
| scheduleReminder / listReminders | lead_reminders | INSERT/SELECT |
| listDistributions / createDistribution / updateDistribution / runDistribution | distribution_schedules (+ bulk UPDATE leads) | CRUD + job |
| listWhatsApp / sendWhatsApp | whatsapp_messages | SELECT/INSERT + call WhatsApp Business API |

## Backend jobs / integrations to build
1. **SLA breach**: scheduled job flips `tele_sla_breached` / `ds_sla_breached` when `*_sla_due_at` passes (working-hours aware if desired).
2. **Distribution runner**: for each active schedule, on its cadence, assign `per_user_count` unassigned leads (matching project/status pool) to each `target_user`.
3. **Reminders**: job that fires `lead_reminders` at `remind_at` (notification/email).
4. **Duplicate detection**: on lead insert, set `is_duplicate`/`duplicate_of` by matching `phone_normalized`.
5. **WhatsApp**: connect a WhatsApp Business API provider (Meta Cloud API / 360dialog / Twilio) for `whatsapp_messages` send + inbound webhook.
6. **Auth**: replace the mock login (`lib/crm/session.ts`) with real auth; map the session user to `users.id`/`role`.
