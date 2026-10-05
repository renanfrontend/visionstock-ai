/** Removes diacritics: "Cerâmica" → "Ceramica". */
export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function slugify(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Uppercase A–Z letters only, accents stripped. */
export function lettersOnly(value: string): string {
  return stripAccents(value).toUpperCase().replace(/[^A-Z]/g, "");
}
