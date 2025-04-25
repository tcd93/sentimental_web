import { NextRequest } from "next/server";
import { jsonResponse } from "@/app/api/response";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Set a secure, HTTP-only cookie for admin session
      const response = jsonResponse({ data: ["ok"] });
      response.cookies.set("admin_auth", "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 4, // 4 hours
      });
      return response;
    } else {
      return jsonResponse({ error: "Invalid credentials" }, 401);
    }
  } catch (e) {
    console.error("Error in login route:", e);
    return jsonResponse({ error: "Malformed request" }, 400);
  }
}
