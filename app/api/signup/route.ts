import { NextResponse } from "next/server";
import { createUser } from "@/database/users";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("Received signup:", body);

    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: name, email, or password",
        },
        { status: 400 }
      );
    }

    const user = await createUser({
      name,
      email,
      password,
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create account. Email may already be in use.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully!",
      user: {
        userid: user.userid,
        useremail: user.useremail,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred during signup",
      },
      { status: 500 }
    );
  }
}