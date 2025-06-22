// File: /src/app/api/auth/callback/route.js

import { NextResponse } from "next/server";
import { AuthorizationCode } from "simple-oauth2";

const client = new AuthorizationCode({
  client: {
    id: process.env.XERO_CLIENT_ID,
    secret: process.env.XERO_CLIENT_SECRET,
  },
  auth: {
    tokenHost: "https://identity.xero.com",
    authorizePath: "/connect/authorize",
    tokenPath: "/connect/token",
  },
});

export async function GET(request) {
  // 1. Grab the ?code= from Xero’s redirect
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    // 2. Exchange it for tokens
    const result = await client.getToken({
      code,
      redirect_uri: process.env.XERO_REDIRECT_URI,
    });
    const token = result.token;

    // 3. Set it as an HTTP-only Secure cookie & redirect home
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("xero_token", JSON.stringify(token), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: token.expires_in, // optional: expire cookie with the token
    });
    return response;
  } catch (error) {
    console.error("Token exchange failed:", error);
    return NextResponse.json(
      { error: "Xero token exchange failed" },
      { status: 500 }
    );
  }
}
