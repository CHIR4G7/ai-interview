import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Mail,
  CalendarDays,
  Coins,
  Briefcase,
  CheckCircle2,
  FileUser,
} from 'lucide-react'
import { auth } from '@/app/auth'
import { getProfile } from './actions'
import PerformanceSection from '@/components/profile/PerformanceSection'
import { Button } from '@/components/ui/button'

const Stat = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) => (
  <div className="flex flex-row items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
      <Icon size={16} />
    </span>
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wider text-neutral-400">
        {label}
      </span>
      <span className="text-sm font-semibold text-neutral-900">{value}</span>
    </div>
  </div>
)

const ProfilePage = async () => {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const profile = await getProfile()
  if (!profile) redirect('/login')

  const initials = (profile.name || profile.email || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const memberSince = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : '—'

  const resumeItems = [
    ...(profile.resume?.projectContext ?? []),
    ...(profile.resume?.workExDetails ?? []),
  ].filter((s) => typeof s === 'string' && s.trim().length > 0)

  return (
    <main className="relative w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-blue-50/70 via-purple-50/40 to-transparent"
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-10 lg:px-8">
        {/* ---------- header ---------- */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-row items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-xl font-extrabold text-white shadow-lg">
              {initials}
            </span>
            <div className="flex flex-col">
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
                {profile.name || 'Your profile'}
              </h1>
              <span className="flex flex-row items-center gap-1.5 text-sm text-neutral-500">
                <Mail size={13} />
                {profile.email}
                {profile.hasGoogle && (
                  <span className="ml-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                    Google
                  </span>
                )}
              </span>
            </div>
          </div>

          <Button
            asChild
            className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 font-semibold"
          >
            <Link href="/create">Start a new interview</Link>
          </Button>
        </div>

        {/* ---------- account stats ---------- */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Coins} label="Credits left" value={String(profile.credits)} />
          <Stat
            icon={Briefcase}
            label="Interviews created"
            value={String(profile.totalInterviews)}
          />
          <Stat
            icon={CheckCircle2}
            label="Completed"
            value={String(profile.completedInterviews)}
          />
          <Stat icon={CalendarDays} label="Member since" value={memberSince} />
        </div>

        {/* ---------- performance ---------- */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-extrabold tracking-tight text-neutral-900">
              Performance over time
            </h2>
            <p className="text-sm text-neutral-500">
              How you are trending across every interview you have taken.
            </p>
          </div>
          <PerformanceSection attempts={profile.attempts} />
        </section>

        {/* ---------- resume on file ---------- */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-extrabold tracking-tight text-neutral-900">
              Resume on file
            </h2>
            <p className="text-sm text-neutral-500">
              Saved once and reused, so you do not re-upload it for every
              interview.
            </p>
          </div>

          {resumeItems.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
              {profile.resume?.skills && profile.resume.skills.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Skills
                  </span>
                  <div className="flex flex-row flex-wrap gap-1.5">
                    {profile.resume.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Experience &amp; projects
                </span>
                <ul className="flex flex-col gap-2">
                  {resumeItems.map((item, i) => (
                    <li
                      key={i}
                      className="flex flex-row gap-2 text-sm leading-relaxed text-neutral-700"
                    >
                      <FileUser size={14} className="mt-1 shrink-0 text-neutral-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <span className="text-xs text-neutral-400">
                Upload a new resume on the create page to replace this.
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-12 text-center">
              <FileUser size={22} className="text-neutral-400" />
              <span className="text-sm font-semibold text-neutral-800">
                No resume saved yet
              </span>
              <span className="max-w-md text-sm text-neutral-500">
                Upload one while creating an interview and it will be saved here
                automatically, then pre-filled next time.
              </span>
              <Button asChild variant="outline" className="mt-1">
                <Link href="/create">Create an interview</Link>
              </Button>
            </div>
          )}
        </section>

        {/* ---------- recent attempts ---------- */}
        {profile.attempts.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-extrabold tracking-tight text-neutral-900">
              Interview history
            </h2>
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-[11px] uppercase tracking-wider text-neutral-400">
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {[...profile.attempts].reverse().map((a) => (
                    <tr key={a.interviewId} className="border-b border-neutral-50">
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {a.jobTitle}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {a.companyName}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {a.createdAt
                          ? new Date(a.createdAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {a.overallScore != null ? (
                          <span className="font-bold text-neutral-900">
                            {a.overallScore}/10
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">
                            Not graded
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {a.overallScore != null && (
                          <Link
                            href={`/interview/${a.interviewId}/feedback`}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            View feedback
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default ProfilePage
