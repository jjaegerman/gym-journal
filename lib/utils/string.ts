/**
 * Capitalizes the first letter of each word in a sentence
 * @param sentence - The sentence to capitalize
 * @returns string - The sentence with each word capitalized
 * @example capitalizeEachWord("hello world") => "Hello World"
 */
export function capitalizeEachWord(sentence: string): string {
  if (!sentence) return "";

  const words = sentence.split(" ");
  const capitalizedWords = words.map((word) => {
    if (word.length === 0) {
      return "";
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  return capitalizedWords.join(" ");
}

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns string - The string with first letter capitalized
 * @example capitalize("hello") => "Hello"
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string to title case
 * @param str - The string to convert
 * @returns string - The string in title case
 * @example toTitleCase("hello-world") => "Hello World"
 */
export function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}
