// No file-system middleware: session is registered globally in main.ts, and
// per-request observability now comes from Fresh's OpenTelemetry request spans
// (spec 12), which superseded the old per-request logger.
export default [];
