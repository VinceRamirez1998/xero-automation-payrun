"use client";
import React, { useState } from "react";

export default function TimesheetUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSub] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files || []));
    setError(null);
    setSub(false);
  };

  const connectXero = () => {
    window.location.href = "/api/auth/login";
  };

  const handleSubmit = async () => {
    setError(null);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const res = await fetch("/api/upload-timesheets", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (res.ok) {
      setSub(true);
    } else {
      const text = await res.text();
      setError(text || "Upload failed");
    }
  };

  return (
    <div className="max-w-lg mx-auto p-8 space-y-4 bg-white rounded shadow">
      <h1 className="text-xl font-bold">Xero Payroll Bulk Uploader</h1>
      <button
        onClick={connectXero}
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        Connect to Xero
      </button>

      <input
        type="file"
        accept=".xlsx,.xls"
        multiple
        onChange={handleFiles}
        className="block"
      />

      {files.length > 0 && (
        <ul className="list-disc ml-5">
          {files.map((f, i) => (
            <li key={i}>{f.name}</li>
          ))}
        </ul>
      )}

      {error && <p className="text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={files.length === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        Upload to Xero
      </button>

      {submitted && (
        <p className="text-green-600">✅ Timesheets uploaded successfully!</p>
      )}
    </div>
  );
}
