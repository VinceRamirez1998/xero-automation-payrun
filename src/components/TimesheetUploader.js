"use client";
import { useState } from "react";

export default function Home() {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));

      const res = await fetch("/api/upload-timesheets", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Upload failed");
      }
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ maxWidth: 400, margin: "2rem auto", fontFamily: "sans-serif" }}
    >
      <h1>Bulk Timesheet → Xero</h1>

      <input
        type="file"
        accept=".xlsx,.xls"
        multiple
        onChange={(e) => {
          setFiles(Array.from(e.target.files));
          setError(null);
          setSuccess(false);
        }}
      />

      {files.length > 0 && (
        <ul style={{ marginTop: 10 }}>
          {files.map((f, i) => (
            <li key={i}>{f.name}</li>
          ))}
        </ul>
      )}

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>✅ Uploaded successfully!</p>}

      <button
        onClick={handleSubmit}
        disabled={files.length === 0 || loading}
        style={{
          marginTop: 20,
          padding: "8px 16px",
          background: loading ? "#999" : "#006aff",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: files.length && !loading ? "pointer" : "not-allowed",
        }}
      >
        {loading ? "Uploading…" : "Upload to Xero"}
      </button>
    </div>
  );
}
