import { THEME_COOKIE_NAME, THEME_COOKIE_NAMES } from "./theme-config";

export function clearThemeCookies() {
  if (typeof document === "undefined") return;
  for (const name of THEME_COOKIE_NAMES) {
    document.cookie = `${name}=;path=/;max-age=0;SameSite=Lax`;
    document.cookie = `${name}=;path=/configuracion;max-age=0;SameSite=Lax`;
  }
}

export function writeThemeCookie(encodedValue: string) {
  if (typeof document === "undefined") return;
  clearThemeCookies();
  const secure = window.location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${THEME_COOKIE_NAME}=${encodedValue};path=/;max-age=31536000;SameSite=Lax${secure}`;
}
