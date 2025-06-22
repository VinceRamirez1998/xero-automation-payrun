"use client";

import React, { useState } from "react";

export default function TimesheetUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files || []));
    setError(null);
    setSubmitted(false);
  };

  // Kick off the Xero OAuth flow
  const connectXero = () => {
    window.location.href = "/api/auth/login";
  };

  // Upload the selected Excel files to your API
  const handleSubmit = async () => {
    setError(null);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    const res = await fetch("/api/upload-timesheets", {
      method: "POST",
      body: formData,
      credentials: "include", // send the xero_token cookie
    });

    if (res.ok) {
      setSubmitted(true);
    } else {
      const msg = await res.text();
      setError(msg || "Upload failed");
    }
  };

  return (
    <div className="max-w-lg mx-auto p-8 bg-white rounded shadow space-y-6">
      <h1 className="text-2xl font-bold text-center">
        Xero Timesheet Bulk Uploader
      </h1>

      <div className="flex justify-center">
        <button
          onClick={connectXero}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Connect to Xero
        </button>
      </div>

      <div>
        <label className="block mb-2 font-medium">
          Select .xlsx/.xls files:
        </label>
        <input
          type="file"
          accept=".xlsx,.xls"
          multiple
          onChange={handleFiles}
          className="block w-full"
        />
      </div>

      {files.length > 0 && (
        <div>
          <p className="font-medium">Files ready to upload:</p>
          <ul className="list-disc list-inside text-sm text-gray-700">
            {files.map((f, idx) => (
              <li key={idx}>{f.name}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <div className="text-red-600 font-medium">⚠️ {error}</div>}

      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={files.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
        >
          Upload to Xero
        </button>
      </div>

      {submitted && (
        <div className="text-green-600 font-medium text-center">
          ✅ Timesheets uploaded successfully!
        </div>
      )}
    </div>
  );
}
