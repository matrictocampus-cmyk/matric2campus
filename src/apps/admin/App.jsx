import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"

// existing student app (whatever you currently render)
import StudentApp from "./apps/student/App"

// new admin app
import AdminApp from "./apps/admin/App"

// auth screens (login/register)
import AuthApp from "./apps/auth/App"

export default function App() {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      setSession(session)

      if (!session) {
        setLoading(false)
        return
      }

      supabase
        .from("admin_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single()
        .then(({ data }) => {
          setIsAdmin(!!data)
          setLoading(false)
        })
    })
  }, [])

  if (loading) return null

  if (!session) return <AuthApp />

  if (isAdmin) return <AdminApp />

  return <StudentApp />
}
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    const session = data.session
    setSession(session)

    if (!session) {
      setLoading(false)
      return
    }

    supabase
      .from("admin_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data, error }) => {
        setIsAdmin(!!data)
        setLoading(false)
      })
  })
}, [])
