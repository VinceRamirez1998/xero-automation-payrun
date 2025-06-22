import { read, utils } from "xlsx";

// Helper: pull the token JSON object out of the incoming request’s cookies
function getTokenFromHeaders(headers) {
  const cookie = headers.get("cookie") || "";
  const match = cookie.match(/xero_token=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

// Helper: generic GET from Xero API, returns parsed JSON
async function xeroGET(path, token) {
  const res = await fetch(`https://api.xero.com/payroll.xro/2.0${path}`, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Xero GET ${path} failed: ${await res.text()}`);
  const json = await res.json();
  return json;
}

export async function POST(req) {
  // 1️⃣ Authenticate
  const token = getTokenFromHeaders(req.headers);
  if (!token) return new Response("Not authenticated", { status: 401 });

  // 2️⃣ Parse all uploaded Excel files
  const formData = await req.formData();
  const files = formData.getAll("files");
  const parsed = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;
    const buffer = await file.arrayBuffer();
    const wb = read(buffer, { type: "buffer" });
    const sheet = wb.SheetNames[0];
    const rows = utils.sheet_to_json(wb.Sheets[sheet]);
    /* rows is an array of objects like:
       { firstname: "James", lastname: "Lebron", "normal hours": 76, ... } */
    parsed.push(...rows);
  }

  // 3️⃣ Fetch lookups from Xero once
  const [{ Employees }, { EarningsRates }] = await Promise.all([
    xeroGET("/Employees", token),
    xeroGET("/EarningsRates", token),
  ]);

  // 4️⃣ Build Timesheets entries grouped by employee
  const timesheetsByEmployee = {};
  for (const row of parsed) {
    const key = `${row.firstname}_${row.lastname}`;
    if (!timesheetsByEmployee[key]) {
      // Find the matching Xero EmployeeID
      const emp = Employees.find(
        (e) => e.FirstName === row.firstname && e.LastName === row.lastname
      );
      if (!emp) {
        return new Response(
          `Unknown employee: ${row.firstname} ${row.lastname}`,
          { status: 400 }
        );
      }
      timesheetsByEmployee[key] = {
        EmployeeID: emp.EmployeeID,
        StartDate: "2025-06-17", // ← adjust your pay period here
        EndDate: "2025-06-30",
        TimesheetLines: [],
      };
    }

    const entry = timesheetsByEmployee[key];

    // Map each column to an EarningsRateID + hours or fixed amount
    const addLine = (rateName, units) => {
      if (!units) return;
      const rate = EarningsRates.find((r) => r.Name === rateName);
      if (!rate) throw new Error(`Missing rate: ${rateName}`);
      entry.TimesheetLines.push({
        EarningsRateID: rate.EarningsRateID,
        NumberOfUnits: units,
        Date: entry.StartDate,
      });
    };

    addLine("Ordinary Hours", row["normal hours"]);
    addLine("Overtime 1.5", row["overtime 1.5"]);
    addLine("Overtime 2.0", row["overtime 2.0"]);
    addLine("Overtime 2.5", row["overtime 2.5"]);
    addLine("Site Allowance", row["site allowance"]);
    addLine("Meal Allowance", row["meal allowance"]);
    // …and so on for your “uplift” / “laha” etc., matching their Xero rate names
  }

  // 5️⃣ Collect into one array
  const Timesheets = Object.values(timesheetsByEmployee);

  // 6️⃣ Send the batch to Xero
  const resp = await fetch("https://api.xero.com/payroll.xro/2.0/Timesheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ Timesheets }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return new Response(`Xero API error: ${err}`, { status: 500 });
  }

  // 7️⃣ Return success
  return new Response(
    JSON.stringify({ success: true, count: Timesheets.length }),
    { headers: { "Content-Type": "application/json" } }
  );
}
