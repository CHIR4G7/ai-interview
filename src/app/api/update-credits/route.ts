import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { getCredits } from "@/lib/credits";

/**
 * Returns the signed-in user's own credit balance.
 *
 * This previously took a `userId` from the request body with no auth check, so
 * anyone could read any user's balance by guessing an id. The id now comes from
 * the session only.
 */
export async function GET() {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ credits: await getCredits(userId) }, { status: 200 })
}

/** Kept as POST for existing callers; the body is ignored. */
export async function POST() {
    return GET()
}
