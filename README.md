
local supabase:

```
supabase start
supabase migration up
supabase functions serve --env-file ./supabase/.env.local --no-verify-jwt --debug
```


pull in remote schema changes to db
```
supabase db pull
```
