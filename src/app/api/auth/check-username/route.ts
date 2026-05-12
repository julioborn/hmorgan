import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";

const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

export async function GET(req: NextRequest) {
    const username = req.nextUrl.searchParams.get("username")?.toLowerCase().trim();
    if (!username || !USERNAME_REGEX.test(username)) {
        return NextResponse.json({ available: false });
    }
    await connectMongoDB();
    const exists = await User.exists({ username });
    return NextResponse.json({ available: !exists });
}
