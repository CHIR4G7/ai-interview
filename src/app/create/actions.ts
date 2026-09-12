'use server'
import { toast } from "sonner"
import { auth } from "../auth"
import axios from 'axios'
import { ref, uploadBytesResumable } from "firebase/storage"
import { storage } from "@/lib/firebase"
import { inngest } from "@/inngest/client"
import { ObjectId } from "mongodb"


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


const sendCreateIngestEvent = async (id: ObjectId) => {

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



export const createInterview = async (data: formD, projectContext: string[], workExDetails: string[]) => {
  const session = await auth()
  // console.log(session?.user)
  console.log("check workex", workExDetails)
  console.log(baseURL)
  try {
    const res = await axios.post(`${baseURL}/api/create-interview`, {
      id: session?.user?.id,
      jobDesc: data.jobDesc,
      skills: data.skills,
      companyName: data.companyName,
      projectContext: projectContext,
      workExDetails: workExDetails,
      jobTitle: data.jobTitle,
      createdAt: new Date()
    })
    // toast("Interview Created Successfully")
    console.log('ye bangya question',res.data)

    sendCreateIngestEvent(res.data.id)

    return { ok: true as const, id: String(res.data.id), newCredits: res.data.newCredits }

  } catch (error: any) {
    // Surface a usable message. The form previously ignored the return value
    // and toasted success unconditionally, so a failed create — including
    // running out of credits — looked like it had worked.
    const status = error?.response?.status
    const message =
      status === 402
        ? 'You have no interview credits left.'
        : status === 401
          ? 'Your session expired. Please sign in again.'
          : error?.response?.data?.error ?? 'Interview could not be created.'
    console.error('createInterview failed:', status, message)
    return { ok: false as const, error: message, code: status === 402 ? 'no-credits' : 'error' }
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


