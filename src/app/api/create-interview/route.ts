import client from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { spendCredit, refundCredit } from "@/lib/credits";

export async function POST(request: NextRequest) {
    try {
        // Identity comes from the session, never from the request body. The
        // body previously carried `id`, so any caller could create interviews
        // as — and drain the credits of — any user they named.
        const session = await auth()
        const userId = session?.user?.id
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { jobDesc, skills, companyName, projectContext, workExDetails, jobTitle } = body

        if (!jobDesc || !companyName || !skills || skills.length === 0) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Take the credit BEFORE creating anything. The old order inserted the
        // interview first and then checked the balance, so a user on zero
        // credits received an interview and simply skipped the decrement.
        const spend = await spendCredit(userId)
        if (!spend.ok) {
            return NextResponse.json(
                {
                    error:
                        spend.reason === 'no-credits'
                            ? "You have no interview credits left."
                            : "User not found",
                    code: spend.reason,
                },
                { status: spend.reason === 'no-credits' ? 402 : 401 }
            )
        }

        const db = client.db();

        try {
            const result = await db.collection("interviews").insertOne({
                userId,
                jobDesc,
                skills,
                jobTitle,
                companyName,
                projectContext: projectContext ?? [],
                workExDetails: workExDetails ?? [],
                createdAt: Date.now(),
                status: 'ready'
            })

            return NextResponse.json(
                {
                    message: "Form saved successfully",
                    id: result.insertedId,
                    newCredits: spend.remaining,
                },
                { status: 201 }
            );
        } catch (err) {
            // The credit is already spent at this point, so hand it back rather
            // than charging for an interview that does not exist.
            await refundCredit(userId)
            throw err
        }
    } catch (error) {
        console.error("Error saving form:", error);
        return NextResponse.json(
            { error: "Something went wrong." },
            { status: 500 }
        )
    }
}
