local dev
```
yarn expo start -c
```

add dep
```
npx expo install foo
```

local supabase:
```
supabase start
supabase migration up
supabase functions serve --env-file ./supabase/.env.local --no-verify-jwt --debug
```

run app against local supabase:
```
cp .env.local.example .env.local
```
then `yarn start` — app connects to local DB and edge functions. Delete `.env.local` to go back to prod.

To seed local DB with prod data:
```
supabase db dump --data-only -f /tmp/prod_data.sql
docker exec -i supabase_db_gym-journal psql -U postgres < /tmp/prod_data.sql
```


pull in remote schema changes to db
```
supabase db pull
```

push local migrations to remote db
```
supabase dp push
```


build for web:
```
npx expo export --platform web
```

publish to web preview
```
eas deploy
```

push prod
```
eas deploy --prod
```
