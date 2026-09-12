import { auth } from "@/app/auth";
import Link from "next/link";
import { Plus, Coins, Briefcase, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserInterviews } from "./actions";
import InterviewCard from "@/components/InterviewCard";
import LandingPage from "@/components/landing/LandingPage";

type User = {
  name: string
  email: string
  id: string
  credits: number
}

const Stat = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType
  label: string
  value: string
  tone: string
}) => (
  <div className="flex flex-row items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
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

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    return <LandingPage />
  }

  const user = session?.user as User
  const interviews = (await getUserInterviews()) ?? []

  const completed = interviews.filter((i) => i.status === 'completed').length
  const pending = interviews.length - completed
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <main className="relative w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-blue-50/70 via-purple-50/40 to-transparent"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 lg:px-8">
        {/* ---------- header ---------- */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
              Welcome back, {firstName}.
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-neutral-600">
              Practice for interviews and{' '}
              <span className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text font-semibold text-transparent">
                ace the real ones.
              </span>
            </p>
          </div>

          <Button
            asChild
            className="h-11 w-fit rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 text-base font-semibold shadow-lg shadow-blue-600/20 transition-transform hover:scale-[1.02] hover:from-blue-600 hover:to-purple-600"
          >
            <Link href="/create" className="flex flex-row items-center gap-2">
              <Plus size={17} />
              New interview
            </Link>
          </Button>
        </div>

        {/* ---------- stats ---------- */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            icon={Coins}
            label="Credits left"
            value={String(user?.credits ?? 0)}
            tone="bg-amber-50 text-amber-600"
          />
          <Stat
            icon={Briefcase}
            label="Total"
            value={String(interviews.length)}
            tone="bg-blue-50 text-blue-600"
          />
          <Stat
            icon={CheckCircle2}
            label="Completed"
            value={String(completed)}
            tone="bg-green-50 text-green-600"
          />
          <Stat
            icon={Sparkles}
            label="Ready to take"
            value={String(pending)}
            tone="bg-purple-50 text-purple-600"
          />
        </div>

        {/* ---------- list ---------- */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-row items-baseline justify-between">
            <h2 className="text-xl font-extrabold tracking-tight text-neutral-900">
              Your interviews
            </h2>
            {interviews.length > 0 && (
              <span className="text-sm text-neutral-500">
                {interviews.length} total
              </span>
            )}
          </div>

          {interviews.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
                <Plus size={22} />
              </span>
              <span className="text-lg font-bold text-neutral-900">
                No interviews yet
              </span>
              <span className="max-w-sm text-sm leading-relaxed text-neutral-500">
                Paste a job description and upload your resume — your first mock
                interview will be ready in under a minute.
              </span>
              <Button
                asChild
                className="mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 font-semibold"
              >
                <Link href="/create">Create your first interview</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...interviews].reverse().map((interview, index) => (
                <InterviewCard interview={interview} key={index} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
