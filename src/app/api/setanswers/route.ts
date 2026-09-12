import client from "@/lib/db";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request:NextRequest) {
    const body = await request.json()
    const {data,id,transcript} = body

    const objid = new ObjectId(id)
    // console.log("api me ",data)
    try {
        const db = client.db()
        const quesBank = await db.collection("questions").findOneAndUpdate(
            {interviewId:id},
            {
                $set:{
                    answers:data,
                    // Voice interviews also store the raw turn list so delivery
                    // metrics (pace, fillers, thinking time) can be derived — and
                    // recomputed later as those metrics improve. Text interviews
                    // send no transcript, so the field is left untouched.
                    ...(Array.isArray(transcript) && transcript.length > 0
                        ? { transcript }
                        : {}),
                }
            }
        )
        console.log("interview",id)
        const intSet = await db.collection("interviews").findOneAndUpdate(
            {_id:objid},
            {
                $set:{
                    status:'completed'
                }
            }
        )
        // const intSet = await data.collection("interviews").find({_id:id})
        // console.log(intSet)
        // console.log(quesBank)
        return NextResponse.json({message:'Answers Uploaded',status:200,questionbank:quesBank?._id,intStatus:intSet?.status})
    } catch (error) {
        return NextResponse.json({message:"Answers Not Uploaded",status:400})
    }
    
}