'use server'
import { inngest } from "@/inngest/client";
import client from "@/lib/db";
import axios from "axios";
import { ObjectId } from "mongodb";

// const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const baseURL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000'
  : 'https://ai-interview-iota-ten.vercel.app';



export const getInterviewDetails = async (id:string)=>{
    if(!id){
        return 
    }
     const dbClient = client;
    const db = dbClient.db();

    const interview = await db.collection("interviews").findOne({_id:new ObjectId(id)})
    return interview
}

export const getQuestions = async (interviewId:string)=>{
    console.log(interviewId)
    if(!interviewId){
        return
    }
    const db = client.db()

    const interviewQuestions = await db.collection("questions").findOne({interviewId:interviewId})
    if(!interviewQuestions){
        return null
    }
    return interviewQuestions
}

export const setAnswers = async (
    data:Record<string, string>[],
    id:string,
    transcript?:unknown[]
)=>{
    try {
        const response = await axios.post(`${baseURL}/api/setanswers`,{
            data:data,
            id:id,
            transcript:transcript
        })
        // console.log(data)

        inngest.send({
            name:'app/generateInsights',
            data:{
                interviewId:id
            }
        })

        return response.data
    } catch (error:any) {
        console.log(error.message)
    }
}