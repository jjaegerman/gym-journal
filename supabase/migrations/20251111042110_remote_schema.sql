revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke select on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

drop function if exists "public"."get_exercise_stats"(p_user_id uuid, p_days_back integer);

drop function if exists "public"."get_user_profile_stats"(p_user_id uuid, p_days_back integer);

create table "public"."exercises" (
    "id" uuid not null default gen_random_uuid(),
    "workout_id" uuid not null,
    "name" text not null,
    "datetime" timestamp with time zone not null default now()
);


alter table "public"."exercises" enable row level security;

create table "public"."logs" (
    "id" uuid not null default gen_random_uuid(),
    "exercise_id" uuid not null,
    "datetime" timestamp with time zone not null default now(),
    "weight" numeric,
    "weight_unit" text,
    "repetitions" integer,
    "duration" integer,
    "effort" text
);


alter table "public"."logs" enable row level security;

create table "public"."workouts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "datetime" timestamp with time zone not null default now()
);


alter table "public"."workouts" enable row level security;

CREATE UNIQUE INDEX exercises_pkey ON public.exercises USING btree (id);

CREATE INDEX exercises_workout_id_datetime_idx ON public.exercises USING btree (workout_id, datetime DESC);

CREATE INDEX logs_exercise_id_datetime_idx ON public.logs USING btree (exercise_id, datetime DESC);

CREATE UNIQUE INDEX logs_pkey ON public.logs USING btree (id);

CREATE UNIQUE INDEX workouts_pkey ON public.workouts USING btree (id);

CREATE INDEX workouts_user_datetime_idx ON public.workouts USING btree (user_id, datetime DESC);

alter table "public"."exercises" add constraint "exercises_pkey" PRIMARY KEY using index "exercises_pkey";

alter table "public"."logs" add constraint "logs_pkey" PRIMARY KEY using index "logs_pkey";

alter table "public"."workouts" add constraint "workouts_pkey" PRIMARY KEY using index "workouts_pkey";

alter table "public"."exercises" add constraint "exercises_workout_id_fkey" FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE not valid;

alter table "public"."exercises" validate constraint "exercises_workout_id_fkey";

alter table "public"."logs" add constraint "logs_effort_check" CHECK ((effort = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))) not valid;

alter table "public"."logs" validate constraint "logs_effort_check";

alter table "public"."logs" add constraint "logs_exercise_id_fkey" FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE not valid;

alter table "public"."logs" validate constraint "logs_exercise_id_fkey";

alter table "public"."logs" add constraint "logs_weight_unit_check" CHECK ((weight_unit = ANY (ARRAY['kg'::text, 'lbs'::text]))) not valid;

alter table "public"."logs" validate constraint "logs_weight_unit_check";

alter table "public"."workouts" add constraint "workouts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."workouts" validate constraint "workouts_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_log(p_exercise_name text, p_weight numeric DEFAULT NULL::numeric, p_weight_unit text DEFAULT NULL::text, p_repetitions integer DEFAULT NULL::integer, p_duration integer DEFAULT NULL::integer, p_effort text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
  v_exercise_id uuid;
  v_log_id uuid;
begin
  -- 1️⃣ Find most recent workout within the last hour for this user
  select id into v_workout_id
  from workouts
  where user_id = v_user_id
    and datetime > now() - interval '1 hour'
  order by datetime desc
  limit 1;

  -- 2️⃣ If no recent workout, create one
  if v_workout_id is null then
    insert into workouts (user_id, datetime)
    values (v_user_id, now())
    returning id into v_workout_id;
  end if;

  -- 3️⃣ Find existing exercise in that workout (case-insensitive match)
  select id into v_exercise_id
  from exercises
  where workout_id = v_workout_id
    and lower(name) = lower(p_exercise_name)
  limit 1;

  -- 4️⃣ If exercise doesn't exist, create it
  if v_exercise_id is null then
    insert into exercises (workout_id, name, datetime)
    values (v_workout_id, p_exercise_name, now())
    returning id into v_exercise_id;
  end if;

  -- 5️⃣ Insert the log
  insert into logs (
    exercise_id,
    datetime,
    weight,
    weight_unit,
    repetitions,
    duration,
    effort
  )
  values (
    v_exercise_id,
    now(),
    p_weight,
    p_weight_unit,
    p_repetitions,
    p_duration,
    p_effort
  )
  returning id into v_log_id;

  return v_log_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_workout_details(p_workout_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', w.id,
    'datetime', w.datetime,
    'exercises', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'name', e.name,
          'logs', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', l.id,
                'datetime', l.datetime,
                'weight', l.weight,
                'weightUnit', l.weight_unit,
                'repetitions', l.repetitions,
                'duration', l.duration,
                'effort', l.effort
              )
              order by l.datetime
            ), '[]'::jsonb)
            from logs l
            where l.exercise_id = e.id
          )
        )
        order by e.datetime
      ), '[]'::jsonb
    )
  )
  into v_result
  from workouts w
  left join exercises e on e.workout_id = w.id
  where w.id = p_workout_id
  group by w.id;

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.user_id := auth.uid();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$function$
;

create policy "Allow read access to all"
on "public"."exercises"
as permissive
for select
to public
using (true);


create policy "Users can delete exercises only for their workouts"
on "public"."exercises"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM workouts w
  WHERE ((w.id = exercises.workout_id) AND (w.user_id = auth.uid())))));


create policy "Users can insert exercises only for their workouts"
on "public"."exercises"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM workouts w
  WHERE ((w.id = exercises.workout_id) AND (w.user_id = auth.uid())))));


create policy "Users can modify exercises only for their workouts"
on "public"."exercises"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM workouts w
  WHERE ((w.id = exercises.workout_id) AND (w.user_id = auth.uid())))));


create policy "Allow read access to all"
on "public"."logs"
as permissive
for select
to public
using (true);


create policy "Users can delete logs only for their exercises"
on "public"."logs"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM (exercises e
     JOIN workouts w ON ((w.id = e.workout_id)))
  WHERE ((e.id = logs.exercise_id) AND (w.user_id = auth.uid())))));


create policy "Users can insert logs only for their exercises"
on "public"."logs"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM (exercises e
     JOIN workouts w ON ((w.id = e.workout_id)))
  WHERE ((e.id = logs.exercise_id) AND (w.user_id = auth.uid())))));


create policy "Users can modify logs only for their exercises"
on "public"."logs"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM (exercises e
     JOIN workouts w ON ((w.id = e.workout_id)))
  WHERE ((e.id = logs.exercise_id) AND (w.user_id = auth.uid())))));


create policy "Allow read access to all"
on "public"."workouts"
as permissive
for select
to public
using (true);


create policy "Users can delete their own workouts"
on "public"."workouts"
as permissive
for delete
to public
using ((user_id = auth.uid()));


create policy "Users can insert their own workouts"
on "public"."workouts"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "Users can modify their own workouts"
on "public"."workouts"
as permissive
for update
to public
using ((user_id = auth.uid()));


CREATE TRIGGER set_user_id_before_insert BEFORE INSERT ON public.workouts FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION set_updated_at();



