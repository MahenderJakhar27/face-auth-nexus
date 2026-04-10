import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, name, embedding } = await req.json();

    if (!email || !embedding || embedding.length !== 512) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // 0. Ensure pgvector extension is enabled
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);

    // 1. Cleanup existing records for this email (to allow re-registration during testing)
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        await prisma.face.deleteMany({ where: { userId: existingUser.id } });
        await prisma.user.delete({ where: { id: existingUser.id } });
    }

    // 2. Create User
    const user = await prisma.user.create({
      data: { email, name: name || "" },
    });

    // 3. Insert Face Embedding
    const vectorString = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Face" ("id", "userId", "embedding") VALUES ($1, $2, $3::vector)`,
      crypto.randomUUID(),
      user.id,
      vectorString
    );

    console.log(`Successfully registered user: ${email}`);
    return NextResponse.json({ success: true, userId: user.id });
  } catch (e: any) {
    console.error("Registration error details:", e);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}
