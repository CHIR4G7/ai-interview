'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Coins, Menu, X, Mic } from 'lucide-react'
import { Button } from './ui/button'
import { handleLogout } from '@/app/(auth)/login/actions'

const publicLinks = [
  { name: 'About Us', href: '/', external: false },
  {
    name: 'Contact Us',
    href: 'https://www.linkedin.com/in/chirag-gupta-528294217/',
    external: true,
  },
]

const appLinks = [
  { name: 'Interviews', href: '/' },
  { name: 'Create', href: '/create' },
  { name: 'Profile', href: '/profile' },
]

const Navbar = () => {
  const { data: session, update, status } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    update()
    setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const authed = status === 'authenticated'
  const credits = (session?.user as { credits?: number } | undefined)?.credits

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl flex-row items-center justify-between gap-4 px-5 lg:px-8">
        {/* brand */}
        <Link href="/" className="flex shrink-0 flex-row items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-sm">
            <Mic size={16} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-neutral-900">
            AI Interview
          </span>
        </Link>

        {/* desktop links */}
        <div className="hidden flex-row items-center gap-1 md:flex">
          {(authed ? appLinks : publicLinks).map((item) => {
            const active = authed && pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                target={'external' in item && item.external ? '_blank' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* right side */}
        <div className="flex flex-row items-center gap-2">
          {authed ? (
            <>
              {typeof credits === 'number' && (
                <Link
                  href="/profile"
                  className="hidden flex-row items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-300 sm:flex"
                  title="Interview credits remaining"
                >
                  <Coins size={13} className="text-amber-500" />
                  {credits}
                </Link>
              )}
              <span className="hidden text-sm text-neutral-600 lg:inline">
                Hi, {session?.user?.name?.split(' ')[0]}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hidden sm:inline-flex"
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:text-blue-600 sm:block"
              >
                Log in
              </Link>
              <Button
                asChild
                className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-600 hover:to-purple-600"
              >
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="border-t border-neutral-200 bg-white px-5 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {(authed ? appLinks : publicLinks).map((item) => (
              <Link
                key={item.name}
                href={item.href}
                target={'external' in item && item.external ? '_blank' : undefined}
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {item.name}
              </Link>
            ))}
            {authed ? (
              <button
                onClick={handleLogout}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
