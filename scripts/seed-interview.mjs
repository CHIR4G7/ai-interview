/**
 * Seeds realistic interview data so the app can be exercised without sitting
 * through a live voice interview each time.
 *
 *   node scripts/seed-interview.mjs --email you@example.com
 *   node scripts/seed-interview.mjs --email you@example.com --count 4
 *   node scripts/seed-interview.mjs --email you@example.com --clean
 *
 * Creates, for the Microsoft "Software Engineer 1" JD:
 *   - one `ready` interview        -> exercises the voice interview flow
 *   - N graded interviews          -> exercises feedback, delivery, insights,
 *                                     and the profile trend charts
 *
 * Every document it writes is tagged `seeded: true` so --clean can remove them
 * without touching real data.
 */
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------- env
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(resolve(__dirname, '..', file), 'utf8')
      for (const line of raw.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const i = trimmed.indexOf('=')
        if (i < 0) continue
        const key = trimmed.slice(0, i).trim()
        const value = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, '')
        if (!process.env[key]) process.env[key] = value
      }
    } catch {
      /* file absent, fine */
    }
  }
}
loadEnv()

// ---------------------------------------------------------------- args
const args = process.argv.slice(2)
const getArg = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')
    ? args[i + 1]
    : fallback
}
const email = getArg('email')
const userIdArg = getArg('userId')
const count = Number(getArg('count', '3'))
const clean = args.includes('--clean')

if (!email && !userIdArg) {
  console.error('Usage: node scripts/seed-interview.mjs --email <you@example.com> [--count 3] [--clean]')
  process.exit(1)
}

// ---------------------------------------------------------------- content
const JOB_DESC = `Function: Software Engineering - Full-Stack Development.
Microsoft is hiring a Software Engineer 1 in Bangalore (1-3 years experience) to build full stack web applications using the latest web technologies in a dynamic and agile environment, contributing to a vibrant partner marketplace.

Responsibilities: Collaboration across business units; Customer Focus, tying engineering decisions to customer value; Drive For Results, following a problem through to its conclusion; Technical Excellence, with a strong demonstrable aptitude for problem solving.

Requirements:
- 1+ years of strong design and coding experience; the candidate must analyse the problem, propose the solution, and implement it in production systems.
- Demonstrable knowledge of Java/Scala/C# and .NET.
- Experience with non-trivial client-side or server-side applications in JavaScript.
- Familiarity with React Native, NodeJS and Express JS is a plus.
- For data engineers, demonstrable experience with Hadoop/HDFS/Apache Spark/Kafka, solid working knowledge of SQL and database design, and experience writing performance-critical code.
- Demonstrable experience shipping software and internet scale services using GraphQL/REST APIs on Amazon Web Services (AWS) and Microsoft Azure.
- Ability to learn and grasp concepts quickly in a fast-paced environment.
- Ability to communicate ideas effectively.`

const SKILLS = ['Java', 'Spring', 'J2EE', 'Hibernate', 'JavaScript', 'NodeJS', 'SQL', 'Azure', 'REST APIs', 'Kafka']

const PROJECT_CONTEXT = [
  'Built a partner onboarding service in Java and Spring Boot handling 2M events per day, backed by PostgreSQL and Kafka for asynchronous fan-out.',
  'Developed an internal analytics dashboard in React and NodeJS with an Express GraphQL gateway, deployed on Azure App Service.',
]
const WORK_EX = [
  'Software Engineer at a B2B SaaS company for two years, working across Java services and a JavaScript front end, shipping to production weekly.',
]

const QUESTIONS = [
  {
    question:
      'Walk me through a Java or Spring service you designed and shipped to production. What were the main design decisions and what would you change now?',
    expectedAnswer:
      'A strong answer names the concrete service, explains layering with Spring Boot controllers, services and repositories, justifies persistence choices such as Hibernate or JDBC, discusses transaction boundaries and connection pooling, and reflects honestly on a tradeoff they would revisit.',
  },
  {
    question:
      'This role involves internet scale REST and GraphQL APIs on Azure. How do you keep an API fast and reliable as traffic grows?',
    expectedAnswer:
      'Expect discussion of pagination, caching layers, idempotency, rate limiting, timeouts and retries with backoff, circuit breakers, horizontal scaling behind a load balancer, and monitoring p99 latency with alerting rather than averages.',
  },
  {
    question:
      'Tell me about a performance problem you diagnosed in a database or data pipeline. How did you find it and what did you fix?',
    expectedAnswer:
      'A strong answer describes measurement before optimisation, reading query plans, identifying missing or wrong indexes, N+1 query patterns from an ORM, batching, and quantifies the improvement with concrete numbers.',
  },
  {
    question:
      'Describe a time you disagreed with a teammate about a technical approach. How did you resolve it?',
    expectedAnswer:
      'Expect a specific situation, the competing options, evidence used such as benchmarks or prototypes, how consensus was reached, and what the outcome was. Shows collaboration and customer focus rather than ego.',
  },
  {
    question:
      'You are asked to ship a v1 feature quickly while moving toward a long-term architecture. How do you decide what to build now and what to defer?',
    expectedAnswer:
      'A strong answer separates reversible from irreversible decisions, argues for getting interfaces and data models right early while deferring internals, mentions feature flags and incremental migration, and ties scope decisions back to customer value.',
  },
]

/** Answers get noticeably stronger across attempts so trend charts have shape. */
const ANSWER_SETS = [
  [
    'Um, so I built a partner onboarding service in Java using Spring Boot. It had like the usual controller service repository layers and we used Hibernate for persistence. Uh, I think if I did it again I would probably look at the transaction boundaries more carefully because we had some long running transactions holding connections.',
    'Basically you need caching and pagination. Uh we used Redis in front of the hot endpoints and that took a lot of load off the database. I know you should watch latency but I mostly looked at averages honestly.',
    'We had a slow endpoint and I added an index and it got faster. Um, I think it was on the created at column.',
    '',
    'I mean you just build the thing that is needed now and refactor later I guess.',
  ],
  [
    'I designed a partner onboarding service in Java and Spring Boot that handled about two million events a day. I split it into controller, service and repository layers, used Hibernate for the write path but dropped to plain JDBC for a couple of hot read queries. Looking back I would pull the Kafka publishing out of the request transaction, because holding a database connection across a network call cost us under load.',
    'The main things are pagination on every collection endpoint, caching the hot reads, and being disciplined about timeouts and retries with backoff so a slow dependency does not cascade. On Azure we scaled horizontally behind the load balancer and alerted on p99 latency rather than the average, because averages hide the tail that customers actually feel.',
    'We had a listing endpoint that degraded as data grew. I pulled the query plan first rather than guessing, and it was doing a sequential scan because the index did not match the filter order. I also found an N plus one coming from a lazy Hibernate association. Fixing the composite index and batching the fetch took p99 from about 1.8 seconds to 240 milliseconds.',
    'A teammate wanted to rewrite our sync integration as an event driven flow in one go. I agreed with the direction but not the timing, since we had no test coverage on the existing path. I prototyped the event driven version behind a feature flag for one partner and we compared error rates for a week. The data showed it was better, so we migrated incrementally instead of rewriting.',
    'I try to separate the decisions that are hard to reverse from the ones that are not. Data models and public interfaces I want to get right early because migrating them later is expensive. Internals I will happily make crude, because rewriting a class is cheap. For v1 I would ship the narrow path behind a flag, instrument it, and let real usage tell me where to invest.',
  ],
]

function buildTranscript(answers, startMs) {
  const turns = []
  let t = startMs
  QUESTIONS.forEach((q, i) => {
    const qWords = q.question.split(/\s+/).length
    const qDuration = Math.round((qWords / 150) * 60_000)
    turns.push({
      key: `interviewer-${i}`,
      turnId: i * 2,
      speaker: 'interviewer',
      text: q.question,
      createdAt: t,
      endedAt: t + qDuration,
      interrupted: false,
      live: false,
    })
    t += qDuration

    const answer = answers[i]
    if (!answer) {
      t += 9_000 // silence where an answer should have been
      return
    }
    const thinking = 2_500 + i * 800
    t += thinking
    const words = answer.split(/\s+/).length
    // ~135 wpm, so the delivery metrics land in a believable band.
    const duration = Math.round((words / 135) * 60_000)
    turns.push({
      key: `candidate-${i}`,
      turnId: i * 2 + 1,
      speaker: 'candidate',
      text: answer,
      createdAt: t,
      endedAt: t + duration,
      interrupted: false,
      live: false,
    })
    t += duration + 1_200
  })
  return turns
}

/**
 * `strength` (0-1) is how good the answers themselves are; separate from how
 * many were given. Keying the score off answered-count alone made a weak but
 * complete attempt score the same as a strong one, so the trend line was flat.
 */
function buildExtracted(answers, strength) {
  const answered = answers.filter((a) => a && a.trim())
  const completeness = answered.length / QUESTIONS.length
  const base = 2 + strength * 6 + completeness * 1.5
  const r = (n) => Math.max(0, Math.min(10, Math.round(n * 10) / 10))
  return {
    overallScore: r(base),
    parameterScores: {
      depthOfKnowledge: r(base + 0.4),
      impactOrientedMindset: r(base - 0.8),
      architecturalFlexibility: r(base + 0.2),
      problemSolvingAndDebuggingSkills: r(base + 0.6),
      collaborationAndCommunication: r(base - 0.2),
    },
    adviceForImprovement: QUESTIONS.map((q, i) => ({
      question: q.question,
      advice: answers[i]
        ? 'Solid direction. Add concrete numbers for the impact and name the tradeoff you rejected, not just the one you chose.'
        : 'You did not answer this question. Even a short, structured attempt scores better than silence.',
    })),
    perQuestionScores: QUESTIONS.map((q, i) => ({
      question: q.question,
      score: answers[i] ? r(base + (i % 2 === 0 ? 0.7 : -0.5)) : 0,
    })),
    overallVerdict:
      strength > 0.7
        ? 'Strong grasp of backend fundamentals with concrete production examples. Quantify impact more consistently and the answers would be interview-ready.'
        : 'Some solid instincts, but several answers stayed abstract and one went unanswered. Prepare specific stories with measurable outcomes.',
  }
}

// ---------------------------------------------------------------- run
const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI is not set. Add it to .env before running this script.')
  process.exit(1)
}

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
})

try {
  await client.connect()
  const db = client.db()

  const user = userIdArg
    ? await db.collection('users').findOne({ _id: new ObjectId(userIdArg) })
    : await db.collection('users').findOne({ email: email.toLowerCase() })

  if (!user) {
    console.error(`No user found for ${email ?? userIdArg}. Sign up in the app first.`)
    process.exit(1)
  }
  const userId = String(user._id)
  console.log(`User: ${user.email} (${userId})`)

  if (clean) {
    const seeded = await db.collection('interviews').find({ userId, seeded: true }).toArray()
    const ids = seeded.map((i) => String(i._id))
    const q = await db.collection('questions').deleteMany({ interviewId: { $in: ids } })
    const r = await db.collection('interviews').deleteMany({ userId, seeded: true })
    console.log(`Removed ${r.deletedCount} seeded interviews and ${q.deletedCount} question docs.`)
    process.exit(0)
  }

  // Always clear prior seeded data first. Re-running (or a run that failed
  // part-way) would otherwise pile up duplicates and skew the trend charts.
  {
    const prior = await db.collection('interviews').find({ userId, seeded: true }).toArray()
    if (prior.length) {
      const ids = prior.map((i) => String(i._id))
      await db.collection('questions').deleteMany({ interviewId: { $in: ids } })
      await db.collection('interviews').deleteMany({ userId, seeded: true })
      console.log(`Cleared ${prior.length} previously seeded interviews.`)
    }
  }

  const now = Date.now()
  const created = []

  // 1. An untaken interview, for exercising the live voice flow.
  {
    const res = await db.collection('interviews').insertOne({
      userId,
      jobDesc: JOB_DESC,
      skills: SKILLS,
      jobTitle: 'Software Engineer 1',
      companyName: 'microsoft',
      projectContext: PROJECT_CONTEXT,
      workExDetails: WORK_EX,
      createdAt: now,
      status: 'ready',
      seeded: true,
    })
    await db.collection('questions').insertOne({
      questions: QUESTIONS,
      answers: [],
      interviewId: String(res.insertedId),
    })
    created.push(['ready (take this one)', String(res.insertedId)])
  }

  // 2. Graded history, weakest first so the trend line climbs.
  for (let n = 0; n < count; n++) {
    const progress = count === 1 ? 1 : n / (count - 1)
    const weak = progress < 0.5
    const answers = weak
      ? ANSWER_SETS[0]
      : ANSWER_SETS[1].map((a, i) =>
          // Mid-range attempts drop the last answer, so "skipped question"
          // handling is visible somewhere in the history.
          progress < 0.9 && i === 4 ? '' : a,
        )
    // Ramps 0 -> 1 across attempts so the profile trend actually climbs.
    const strength = weak ? 0.15 + progress * 0.3 : 0.55 + progress * 0.45

    const createdAt = now - (count - n) * 3 * 86_400_000
    const res = await db.collection('interviews').insertOne({
      userId,
      jobDesc: JOB_DESC,
      skills: SKILLS,
      jobTitle: 'Software Engineer 1',
      companyName: 'microsoft',
      projectContext: PROJECT_CONTEXT,
      workExDetails: WORK_EX,
      createdAt,
      status: 'completed',
      seeded: true,
    })
    const interviewId = String(res.insertedId)

    await db.collection('questions').insertOne({
      questions: QUESTIONS,
      answers: answers.map((a) => ({ answer: a })),
      transcript: buildTranscript(answers, createdAt),
      extracted: buildExtracted(answers, strength),
      interviewId,
    })
    created.push([`graded attempt ${n + 1}`, interviewId])
  }

  console.log('\nSeeded:')
  for (const [label, id] of created) {
    console.log(`  ${label.padEnd(24)} /interview/${id}/perform`)
  }
  console.log('\nOpen / to see the dashboard, or /profile for the trend charts.')
  console.log('Run again with --clean to remove everything this script created.')
} catch (err) {
  console.error('Seed failed:', err.message)
  process.exitCode = 1
} finally {
  await client.close()
}
