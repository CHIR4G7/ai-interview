'use server'
import { toast } from "sonner"
import { auth } from "../auth"
import axios from 'axios'
import { ref, uploadBytesResumable } from "firebase/storage"
import { storage } from "@/lib/firebase"
import { inngest } from "@/inngest/client"
import db from "@/lib/db"
import { spendCredit, refundCredit } from "@/lib/credits"


type formD = {
  jobDesc: string,
  skills: string[],
  companyName: string,
  jobTitle: string
}

// const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const baseURL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000'
  : 'https://ai-interview-iota-ten.vercel.app';


const maxTries = 3;
let attempt = 0;


const sendCreateIngestEvent = async (id: string) => {

  const attemptFunc = async () => {
    console.log(id)
    inngest.send({
      name: 'app/create-questions',
      data: {
        id: id
      }
    }).then((data) => {
      console.log("Inngest Event Successful")
    }).catch((err) => {
      attempt++;
      console.error(` Attempt ${attempt} failed:`, err);
      if (attempt <= maxTries) {
        setTimeout(() => {
          attemptFunc()
        }, 2000) // Retry after - 2 seconds
      } else {
        console.error('Failed to send Inngest event after max retries.');
      }
    })
  }
  attemptFunc();
}



/**
 * Creates the interview directly against the database.
 *
 * This used to POST to /api/create-interview. That was a server-to-server HTTP
 * call, so the browser's session cookie was never attached — the moment the
 * route started checking `auth()`, every create failed with 401. A server action
 * already runs with the session, so the hop was pure overhead (and pinned a
 * hardcoded production URL). Talking to Mongo directly removes both problems.
 */
export const createInterview = async (data: formD, projectContext: string[], workExDetails: string[]) => {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return { ok: false as const, error: 'Your session expired. Please sign in again.', code: 'unauthorized' }
  }

  if (!data.jobDesc || !data.companyName || !data.skills?.length) {
    return { ok: false as const, error: 'Please fill in every required field.', code: 'invalid' }
  }

  // Take the credit first; atomic, so it cannot go negative or be double spent.
  const spend = await spendCredit(userId)
  if (!spend.ok) {
    return {
      ok: false as const,
      error:
        spend.reason === 'no-credits'
          ? 'You have no interview credits left.'
          : 'We could not find your account.',
      code: spend.reason,
    }
  }

  try {
    const result = await db.db().collection("interviews").insertOne({
      userId,
      jobDesc: data.jobDesc,
      skills: data.skills,
      jobTitle: data.jobTitle,
      companyName: data.companyName,
      projectContext: projectContext ?? [],
      workExDetails: workExDetails ?? [],
      createdAt: Date.now(),
      status: 'ready',
    })

    // Must be a plain string: createQuestions stores this as `interviewId`, and
    // every later lookup compares it against String(interview._id).
    sendCreateIngestEvent(String(result.insertedId))

    return { ok: true as const, id: String(result.insertedId), newCredits: spend.remaining }
  } catch (error) {
    // Hand the credit back rather than charging for an interview that does not exist.
    await refundCredit(userId)
    console.error('createInterview failed:', error)
    return { ok: false as const, error: 'Interview could not be created.', code: 'error' }
  }
}

export const parsingResume = async (file: File) => {
  const formData = new FormData()
  formData.append("resume", file)

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(`📁 Field: ${key}`);
      console.log(`→ name: ${value.name}`);
      console.log(`→ type: ${value.type}`);
      console.log(`→ size: ${value.size}`);
    } else {
      console.log(`📝 Field: ${key} = ${value}`);
    }
  }
  try {
    // const res = await axios.post(`${baseURL}/api/parse-resume`,formData,{
    //   headers:{
    //     'Content-Type':'multipart/form-data'
    //   }
    // })
    const res = await axios.post(`${baseURL}/api/parse-resume`, formData, {
      // headers:{
      //   'Content-Type':'multipart/form-data'
      // }
    })
    // console.log("reasponse aagya",res.data)
    return res.data
  } catch (error: any) {
    console.log(error.message)
    return { error: error.message }
  }
}


