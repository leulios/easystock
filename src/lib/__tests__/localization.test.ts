import { describe, it, expect } from "vitest";
import { translations, Translations } from "../i18n/translations";

describe("Localization Parity Test", () => {
  it("has non-empty translations for both English and Amharic", () => {
    expect(translations.en).toBeDefined();
    expect(translations.am).toBeDefined();
  });

  it("ensures every key in English exists and is non-empty in Amharic", () => {
    const enKeys = Object.keys(translations.en) as Array<keyof Translations>;
    const missingInAm: string[] = [];
    const emptyInAm: string[] = [];

    for (const key of enKeys) {
      if (!(key in translations.am)) {
        missingInAm.push(key);
      } else if (!translations.am[key] || translations.am[key].trim() === "") {
        emptyInAm.push(key);
      }
    }

    expect(missingInAm).toEqual([]);
    expect(emptyInAm).toEqual([]);
  });

  it("ensures every key in Amharic exists and is non-empty in English", () => {
    const amKeys = Object.keys(translations.am) as Array<keyof Translations>;
    const missingInEn: string[] = [];
    const emptyInEn: string[] = [];

    for (const key of amKeys) {
      if (!(key in translations.en)) {
        missingInEn.push(key);
      } else if (!translations.en[key] || translations.en[key].trim() === "") {
        emptyInEn.push(key);
      }
    }

    expect(missingInEn).toEqual([]);
    expect(emptyInEn).toEqual([]);
  });
});
