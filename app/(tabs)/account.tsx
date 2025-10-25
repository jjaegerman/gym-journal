import { useEffect, useState } from 'react'
import Account from '../../components/Account'
import { Session } from '@supabase/supabase-js'
import { supabase } from 'lib/supabase'

export default function AccountTabScreen() {
const [session, setSession] = useState<Session | null>(null)
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        })
        supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        })
    }, [])

  return (
    <Account key={session?.user.id} session={session!} />
  )
}