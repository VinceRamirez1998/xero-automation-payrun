import { AuthorizationCode } from "simple-oauth2";

// OAuth client setup (same as before)
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
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return new Response("Missing code", { status: 400 });
  }

  // Exchange code for token
  let token;
  try {
    const result = await client.getToken({
      code,
      redirect_uri: process.env.XERO_REDIRECT_URI,
    });
    token = result.token;
  } catch (err) {
    console.error("Token exchange error", err);
    return new Response("OAuth error", { status: 500 });
  }

  // Return HTML that writes the cookie and redirects to /
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Logging you in…</title></head>
      <body>
        <script>
          // Store the token as an HTTP-ish cookie via JS
          document.cookie = "xero_token=" 
            + encodeURIComponent(${JSON.stringify(token)}) 
            + "; path=/; secure; samesite=lax;";
          // Now go home
          window.location.href = "/";
        </script>
        <p>Logging you in…</p>
      </body>
    </html>
  `;
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
