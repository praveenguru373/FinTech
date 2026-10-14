import type { FinancialProfile } from "../types";

const PROFILE_KEY = "fintech.profile.v1";
const DRAFT_KEY = "fintech.onboarding-draft.v1";
const VERIFICATION_KEY = "fintech.local-verification.v1";
let activeUserId: string | null = null;

export function setStorageUserId(userId: string | null): void {
  activeUserId = userId;
}

function scopedKey(key: string): string {
  return activeUserId ? `fintech.account.${activeUserId}.${key.replace(/^fintech\./, "")}` : key;
}

export function readLocalVerification(): string | null {
  try {
    const raw = localStorage.getItem(VERIFICATION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { phone?: unknown; mode?: unknown };
    return value.mode === "development" && typeof value.phone === "string" ? value.phone : null;
  } catch (error) {
    console.error("Unable to read local verification state.", error);
    return null;
  }
}

export function writeLocalVerification(phone: string): void {
  localStorage.setItem(VERIFICATION_KEY, JSON.stringify({ phone, mode: "development" }));
}

export function clearLocalVerification(): void {
  localStorage.removeItem(VERIFICATION_KEY);
}

export function readProfile(): FinancialProfile | null {
  try {
    const raw = localStorage.getItem(scopedKey(PROFILE_KEY));
    return raw ? (JSON.parse(raw) as FinancialProfile) : null;
  } catch (error) {
    console.error("Unable to read local financial profile.", error);
    return null;
  }
}

export function writeProfile(profile: FinancialProfile): void {
  localStorage.setItem(scopedKey(PROFILE_KEY), JSON.stringify(profile));
  window.dispatchEvent(new Event("fintech-profile-updated"));
}

export function readDraft<T>(): T | null {
  try {
    const raw = localStorage.getItem(scopedKey(DRAFT_KEY));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error("Unable to read onboarding draft.", error);
    return null;
  }
}

export function writeDraft(value: unknown): void {
  localStorage.setItem(scopedKey(DRAFT_KEY), JSON.stringify(value));
}

export function clearDraft(): void {
  localStorage.removeItem(scopedKey(DRAFT_KEY));
}

export function deleteLocalData(): void {
  localStorage.removeItem(scopedKey(PROFILE_KEY));
  clearDraft();
  if (!activeUserId) clearLocalVerification();
  window.dispatchEvent(new Event("fintech-profile-updated"));
}
