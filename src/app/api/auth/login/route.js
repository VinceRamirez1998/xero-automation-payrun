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

export async function GET() {
  const url = client.authorizeURL({
    redirect_uri: process.env.XERO_REDIRECT_URI,
    scope: "openid profile email payroll.employees payroll.timesheets",
    state: Math.random().toString(36).slice(2), // simple CSRF token
  });
  return Response.redirect(url);
}
