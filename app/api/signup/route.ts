import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  console.log("Received signup:", body);

  return NextResponse.json({
    success: true,
    message: "Account created successfully!",
  });
}