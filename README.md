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
