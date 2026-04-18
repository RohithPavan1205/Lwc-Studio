import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Initial response object
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Get credentials from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If environment variables are missing, don't crash yet, 
  // though auth will not work as expected.
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  // IMPORTANT: Do not move this logic before createServerClient
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protected paths
  const isDashboard = pathname.startsWith('/dashboard')

  // Logic: 
  // 1. If not logged in and trying to access dashboard -> Redirect to landing page (/)
  if (!user && isDashboard) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Ensure we don't automatically bounce users from the landing page when they 
  // explicitly click the logo to go back there.


  // 3. To handle error cases like ?error=invalid_state on the landing page
  // we could let them stay, but typically a logged-in user facing an error
  // should just go to the dashboard where errors can be shown differently.
  // We'll just do a clean redirect for now.

  return supabaseResponse
}
