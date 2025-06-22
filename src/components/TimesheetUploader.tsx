"use client";

import React, { useState, useEffect } from "react";

export default function TimesheetUploader() {
  const [token, setToken] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSub] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // load token from localStorage
  useEffect(() => {
    const saved = window.localStorage.getItem("xero_token");
    if (saved) setToken(saved);
  }, []);

  // when token changes, persist it
  useEffect(() => {
    if (token) window.localStorage.setItem("xero_token", token);
  }, [token]);

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow space-y-6">
      <h1 className="text-2xl font-bold">Excel → Xero Timesheet Uploader</h1>

      <div className="space-y-2">
        <label className="font-medium">
          Step 1: Paste your Xero Access Token
        </label>
        <textarea
          rows={3}
          value={token}
          onChange={(e) => setToken(e.target.value.trim())}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          className="w-full border px-2 py-1"
        />
        <p className="text-sm text-gray-600">
          You can obtain a token from Postman or Xero’s OAuth playground.
        </p>
      </div>

      <div className="space-y-2">
        <label className="font-medium">Step 2: Select your .xlsx files</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          className="block"
        />
      </div>

      {files.length > 0 && (
        <ul className="list-disc ml-5">
          {files.map((f, i) => (
            <li key={i}>{f.name}</li>
          ))}
        </ul>
      )}

      {error && <p className="text-red-600">{error}</p>}
      {submitted && <p className="text-green-600">✅ Uploaded!</p>}

      <button
        disabled={!token || files.length === 0}
        onClick={async () => {
          setError(null);
          const form = new FormData();
          files.forEach((f) => form.append("files", f));

          const res = await fetch("/api/upload-timesheets", {
            method: "POST",
            body: form,
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) setSub(true);
          else {
            const txt = await res.text();
            setError(txt || "Upload failed");
          }
        }}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        Upload to Xero
      </button>
    </div>
  );
}
