import { read, utils } from "xlsx";
import { NextResponse } from "next/server";

export async function POST(request) {
  // 1️⃣ Get token from Authorization header
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.text("Missing Bearer token", { status: 401 });
  }
  const token = JSON.parse(auth.replace("Bearer ", ""));

  // 2️⃣ Parse Excel uploads
  const form = await request.formData();
  const files = form.getAll("files");
  const rows = [];
  for (const file of files) {
    if (!(file instanceof File)) continue;
    const buf = await file.arrayBuffer();
    const wb = read(buf, { type: "buffer" });
    const sheet = wb.SheetNames[0];
    rows.push(...utils.sheet_to_json(wb.Sheets[sheet]));
  }

  // 3️⃣ Lookup Employees & EarningsRates
  const [eRes, rRes] = await Promise.all([
    fetch("https://api.xero.com/payroll.xro/2.0/Employees", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    }),
    fetch("https://api.xero.com/payroll.xro/2.0/EarningsRates", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    }),
  ]);
  if (!eRes.ok || !rRes.ok) {
    const eTxt = await eRes.text(),
      rTxt = await rRes.text();
    return NextResponse.text(`Lookup error: ${eTxt}; ${rTxt}`, { status: 500 });
  }
  const { Employees } = await eRes.json();
  const { EarningsRates } = await rRes.json();

  // 4️⃣ Build Timesheet batch
  const byEmp = {};
  for (const r of rows) {
    const key = `${r.firstname}_${r.lastname}`;
    if (!byEmp[key]) {
      const emp = Employees.find(
        (e) => e.FirstName === r.firstname && e.LastName === r.lastname
      );
      if (!emp) {
        return NextResponse.text(
          `Unknown employee: ${r.firstname} ${r.lastname}`,
          { status: 400 }
        );
      }
      byEmp[key] = {
        EmployeeID: emp.EmployeeID,
        StartDate: "2025-06-17",
        EndDate: "2025-06-30",
        TimesheetLines: [],
      };
    }
    const entry = byEmp[key];
    const add = (name, v) => {
      if (!v) return;
      const rate = EarningsRates.find((x) => x.Name === name);
      if (!rate) throw new Error(`Missing rate: ${name}`);
      entry.TimesheetLines.push({
        EarningsRateID: rate.EarningsRateID,
        NumberOfUnits: v,
        Date: entry.StartDate,
      });
    };
    add("Ordinary Hours", r["normal hours"]);
    add("Overtime 1.5", r["overtime 1.5"]);
    add("Overtime 2.0", r["overtime 2.0"]);
    add("Overtime 2.5", r["overtime 2.5"]);
    add("Site Allowance", r["site allowance"]);
    add("Meal Allowance", r["meal allowance"]);
  }

  const Timesheets = Object.values(byEmp);

  // 5️⃣ Send to Xero
  const postRes = await fetch(
    "https://api.xero.com/payroll.xro/2.0/Timesheets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ Timesheets }),
    }
  );
  if (!postRes.ok) {
    const msg = await postRes.text();
    return NextResponse.text(`Xero POST error: ${msg}`, { status: 500 });
  }

  return NextResponse.json({ success: true, count: Timesheets.length });
}
