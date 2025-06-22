// src/app/api/upload-timesheets/route.js
import { read, utils } from "xlsx";
import { NextResponse } from "next/server";

const { XERO_CLIENT_ID, XERO_CLIENT_SECRET } = process.env;

// 1️⃣ Fetch a Client-Credentials token with the full set of payroll scopes
async function fetchXeroToken() {
  const creds = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString(
    "base64"
  );

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    scope: [
      "payroll.employees",
      "payroll.payitems",
      "payroll.payrollcalendars",
      "payroll.timesheets",
    ].join(" "),
  });

  const resp = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token fetch failed: ${err}`);
  }

  const { access_token } = await resp.json();
  return access_token;
}

export async function POST(request) {
  try {
    // 1) Get OAuth2 token
    const token = await fetchXeroToken();

    // 2) Parse incoming Excel files
    const formData = await request.formData();
    const rows = [];
    for (const file of formData.getAll("files")) {
      if (!(file instanceof File)) continue;
      const buffer = await file.arrayBuffer();
      const wb = read(buffer, { type: "buffer" });
      const sheet = wb.SheetNames[0];
      rows.push(...utils.sheet_to_json(wb.Sheets[sheet]));
    }

    // 3) Lookup Employees & EarningsRates (pay items)
    const [eRes, rRes] = await Promise.all([
      fetch("https://api.xero.com/payroll.xro/2.0/Employees", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("https://api.xero.com/payroll.xro/2.0/EarningsRates", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (!eRes.ok || !rRes.ok) {
      const eTxt = await eRes.text(),
        rTxt = await rRes.text();
      throw new Error(`Lookup failed: ${eTxt}; ${rTxt}`);
    }

    const { Employees } = await eRes.json();
    const { EarningsRates } = await rRes.json();

    // 4) Build Timesheet batch grouped by employee
    const byEmp = {};
    for (const r of rows) {
      const key = `${r.firstname}_${r.lastname}`;
      if (!byEmp[key]) {
        const emp = Employees.find(
          (e) => e.FirstName === r.firstname && e.LastName === r.lastname
        );
        if (!emp) {
          throw new Error(`Unknown employee: ${r.firstname} ${r.lastname}`);
        }
        byEmp[key] = {
          EmployeeID: emp.EmployeeID,
          StartDate: "2025-06-17",
          EndDate: "2025-06-30",
          TimesheetLines: [],
        };
      }
      const entry = byEmp[key];

      const addLine = (rateName, val) => {
        if (!val) return;
        const rate = EarningsRates.find((x) => x.Name === rateName);
        if (!rate) throw new Error(`Missing rate: ${rateName}`);
        entry.TimesheetLines.push({
          EarningsRateID: rate.EarningsRateID,
          NumberOfUnits: val,
          Date: entry.StartDate,
        });
      };

      addLine("Ordinary Hours", r["normal hours"]);
      addLine("Overtime 1.5", r["overtime 1.5"]);
      addLine("Overtime 2.0", r["overtime 2.0"]);
      addLine("Overtime 2.5", r["overtime 2.5"]);
      addLine("Site Allowance", r["site allowance"]);
      addLine("Meal Allowance", r["meal allowance"]);
    }

    const Timesheets = Object.values(byEmp);

    // 5) POST the batch to Xero
    const postRes = await fetch(
      "https://api.xero.com/payroll.xro/2.0/Timesheets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Timesheets }),
      }
    );

    if (!postRes.ok) {
      const err = await postRes.text();
      throw new Error(`Xero API error: ${err}`);
    }

    // ✅ Success
    return NextResponse.json(
      { success: true, count: Timesheets.length },
      { status: 200 }
    );
  } catch (err) {
    // 🚨 Error
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
