import en from "./en";
import th from "./th";

export type Lang = "en" | "th";
type Dict = typeof en;

const DICTS: Record<Lang, Dict> = { en, th };

let currentLang: Lang = (localStorage.getItem("lang") as Lang) || "en";

export function setLang(l: Lang) {
  currentLang = l;
  localStorage.setItem("lang", l);
}

export function getLang(): Lang {
  return currentLang;
}

function interpolate(s: string, params?: Record<string, string | number>) {
  if (!params) return s;
  return s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) =>
    params[k] != null ? String(params[k]) : ""
  );
}

export function t<K extends keyof Dict>(
  key: K,
  params?: Record<string, string | number>
): string {
  const dict = DICTS[currentLang] as Dict;
  const raw = (dict[key] ?? String(key)) as string;
  return interpolate(raw, params);
}
