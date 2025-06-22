"use client";

import React, { useState } from "react";

export default function TimesheetUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = Array.from(e.target.files || []);
    setFiles(uploaded);
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await fetch("/api/upload-timesheets", {
      method: "POST",
      body: formData,
    });

    if (res.ok) setSubmitted(true);
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white rounded shadow space-y-4">
      <h2 className="text-2xl font-bold">Upload Timesheets</h2>

      <input
        type="file"
        accept=".xlsx,.xls"
        multiple
        onChange={handleFileUpload}
      />

      <ul className="text-sm text-gray-600">
        {files.map((f, i) => (
          <li key={i}>📄 {f.name}</li>
        ))}
      </ul>

      <button
        onClick={handleSubmit}
        disabled={files.length === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Submit to Xero
      </button>

      {submitted && (
        <div className="text-green-600 font-medium">
          ✅ Uploaded successfully!
        </div>
      )}
    </div>
  );
}
