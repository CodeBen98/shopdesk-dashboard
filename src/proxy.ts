import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Skip if env vars not configured yet
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    if (user && (
      request.nextUrl.pathname.startsWith('/auth/login') ||
      request.nextUrl.pathname.startsWith('/auth/signup')
    )) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Onboarding redirect: if user has a shop with onboarding_complete = false,
    // redirect to /onboard unless already there or on an auth route
    if (
      user &&
      !request.nextUrl.pathname.startsWith('/onboard') &&
      !request.nextUrl.pathname.startsWith('/auth/')
    ) {
      const { data: shop } = await supabase
        .from('shops')
        .select('onboarding_complete')
        .eq('owner_id', user.id)
        .single()

      if (shop && !shop.onboarding_complete) {
        return NextResponse.redirect(new URL('/onboard', request.url))
      }
    }
  } catch {
    // Auth error — let the request through, page-level auth will handle it
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
