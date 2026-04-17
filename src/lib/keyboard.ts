const INTERACTIVE_TAGS = new Set(["INPUT", "TEXTAREA", "BUTTON", "SELECT", "A"]);

export function isInteractiveFocus(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return INTERACTIVE_TAGS.has(el.tagName) || el.isContentEditable;
}
