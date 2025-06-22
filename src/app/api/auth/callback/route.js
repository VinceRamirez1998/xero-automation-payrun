const headers = new Headers({
  "Set-Cookie": [
    `xero_token=${encodeURIComponent(JSON.stringify(token))}`,
    "Path=/", // cookie is valid on all routes
    "HttpOnly", // only sent in requests, not visible to JS
    "SameSite=None", // allow cross-site in case of redirect
    "Secure", // required for None
  ].join("; "),
  "Content-Type": "application/json",
});
return new Response(JSON.stringify({ success: true }), { headers });
