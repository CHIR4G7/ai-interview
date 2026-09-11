import axios from "axios"
import { auth } from "./auth";
import client from "@/lib/db";
import { ObjectId } from "mongodb";
import { Interview, InterviewCardProps } from "@/types/interview";
import { inngest } from "@/inngest/client";
import { P } from "node_modules/framer-motion/dist/types.d-Cjd591yU";



export const getUserInterviews = async () => {
        const session = await auth()
        const userId = session?.user?.id

        if (!userId) {
                return []
        }

        const dbClient = client;
        const db = dbClient.db();

        const interviews = await db.collection("interviews").find({ userId: userId }).toArray() as unknown as Interview[];

        // `status` becomes 'completed' as soon as answers are saved, but the
        // graded report only exists once inngest `generateInsights` has written
        // `extracted`. Deriving readiness from that document (rather than a flag
        // on the interview) keeps interviews graded before this change working.
        const ids = interviews.map((i) => String(i._id))
        const graded = await db
                .collection("questions")
                .find(
                        { interviewId: { $in: ids }, extracted: { $exists: true } },
                        { projection: { interviewId: 1 } },
                )
                .toArray()
        const gradedIds = new Set(graded.map((q) => q.interviewId))

        return interviews.map((interview) => ({
                ...interview,
                insightsReady: gradedIds.has(String(interview._id)),
        }))
}

export const updateCreds = async (id: string) => {
       if(!id){
        return ;
       }
       const db = client.db()

       const user = await db.collection('users').findOne({_id:new ObjectId(id)})
       return user?.credits;
}