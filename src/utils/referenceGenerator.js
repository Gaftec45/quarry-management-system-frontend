
function getLocalDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${day}`;
}

function generateUniqueSuffix() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase();
}

export function generateReference(prefix, date = new Date()) {
  if (!prefix || typeof prefix !== "string") {
    throw new Error("A reference prefix is required.");
  }

  return `${prefix.toUpperCase()}-${getLocalDateStamp(date)}-${generateUniqueSuffix()}`;
}

export function generateIdempotencyKey(prefix = "record") {
  return `${prefix.toLowerCase()}-${crypto.randomUUID()}`;
}
