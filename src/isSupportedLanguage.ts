/**
 * Whether the language of a file is supported by the client
 *
 * @param languageId
 */
export function isSupportedLanguage(languageId: string): boolean {
  switch (languageId) {
    case "scala":
    case "sc":
    case "java":
    case "twirl":
      return true;
    default:
      return false;
  }
}
