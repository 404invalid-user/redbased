/**
 * pluralize a string eg car -> cars
 * @param word - the word
 * @returns 
 */
function pluralize(word: string): string {
  // Define some common pluralization rules
  const pluralRules: [RegExp, string][] = [
    [/s$/, 'es'],   // words ending in "s"
    [/y$/, 'ies'],  // words ending in "y"
    [/$/, 's']      // default rule, just add "s"
  ];

  // Check if the word matches any of the pluralization rules
  for (const [rule, replacement] of pluralRules) {
    if (rule.test(word)) {
      return word.replace(rule, replacement);
    }
  }

  // If no rule matches, just add "s" by default
  return word + 's';
}

export default pluralize;