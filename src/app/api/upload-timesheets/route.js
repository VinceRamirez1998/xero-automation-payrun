import { read, utils } from "xlsx";

export async function POST(req) {
  // Grab the incoming files from the form
  const formData = await req.formData();
  const files = formData.getAll("files");

  // We'll collect parsed results here
  const parsed = [];

  for (const file of files) {
    // Only process real File objects
    if (!(file instanceof File)) continue;

    // Read the Excel into memory
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: "buffer" });

    // Pick the very first worksheet
    const sheetNames = workbook.SheetNames;
    if (!Array.isArray(sheetNames) || sheetNames.length === 0) continue;
    const firstSheet = sheetNames[0];

    // Convert that sheet into JSON rows
    const worksheet = workbook.Sheets[firstSheet];
    const rows = utils.sheet_to_json(worksheet);

    // Save filename + its JSON rows
    parsed.push({
      name: file.name,
      data: rows,
    });
  }

  // Return a JSON response
  return new Response(
    JSON.stringify({
      success: true,
      fileCount: parsed.length,
      files: parsed,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
