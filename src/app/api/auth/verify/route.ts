import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { embedding } = await req.json();

    if (!embedding || embedding.length !== 512) {
      return NextResponse.json({ error: "Invalid embedding" }, { status: 400 });
    }

    const vectorString = `[${embedding.join(",")}]`;

    // Perform vector similarity search
    // <-> is Euclidean distance, <=> is cosine distance
    // We use cosine similarity (1 - cosine distance)
    const results: any[] = await prisma.$queryRawUnsafe(`
      SELECT "userId", email, name, 
      (1 - ("embedding" <=> $1::vector)) as similarity
      FROM "Face"
      JOIN "User" ON "Face"."userId" = "User"."id"
      ORDER BY similarity DESC
      LIMIT 1
    `, vectorString);

    if (results.length === 0 || results[0].similarity < 0.85) {
      return NextResponse.json({ error: "Face not recognized" }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: results[0].userId,
        email: results[0].email,
        name: results[0].name
      },
      similarity: results[0].similarity 
    });
  } catch (e: any) {
    console.error("Verification error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
