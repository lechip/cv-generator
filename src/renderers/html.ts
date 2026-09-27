import type { Resume } from "../types.js";
import { render } from "../../themes/modern-europass/index.js";

export function renderHtml(resume: Resume, theme: string): string {
  if (theme !== "modern-europass") throw new Error(`Unknown theme: ${theme}`);
  return render(resume);
}
