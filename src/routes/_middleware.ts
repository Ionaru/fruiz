// No file-system middleware: session is registered globally in main.ts, and
// per-request observability comes from Fresh's OpenTelemetry request spans
// (spec 12).
export default [];
