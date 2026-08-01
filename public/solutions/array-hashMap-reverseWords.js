// reverseWords.js
export default function run() {
  /*
 Given an input string s, reverse the order of the words.
 A word is defined as a sequence of non-space characters.
 The words in s will be separated by at least one space.
 Return a string of the words in reverse order concatenated by a single space.

 Note that s may contain leading or trailing spaces or multiple spaces between two words.
 The returned string should only have a single space separating the words.
 Do not include any extra spaces.
 */

  class Solution {
    /**
     * @param {string} s
     * @return {string}
     */

    reverseWords(s) {
      //   const result = [];
      //   let i = s.length - 1;
      //   while (i >= 0) {
      //     while (i >= 0 && s[i] === " ") i--;
      //     if (i < 0) break;
      //     let end = i;
      //     while (i >= 0 && s[i] !== " ") i--;
      //     result.push(s.substring(i + 1, end + 1));
      //   }
      //   return result.join(" ");

      // Time: O(n) — every character is visited once. Space: O(n) — the result array and output string.

      return s.trim().split(/\s+/).reverse().join(" ");

      // Time: O(n) — same as the manual version. Space: O(n) — same too. The win here isn't asymptotic, it's correctness and readability: no off-by-one risk on word boundaries, and the regex split handles all the messy-spacing edge cases for you in one call.
    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.reverseWords("the sky is blue")); // "blue is sky the"

  console.log(solution.reverseWords("  hello world  ")); // "world hello"
  console.log(solution.reverseWords("a good   example")); // "example good a"
  console.log(solution.reverseWords("  Bob    Loves  Alice   ")); // "Alice Loves Bob"
  console.log(solution.reverseWords("Alice")); // "Alice"
  console.log(solution.reverseWords("    ")); // "" (empty string)
  console.log(solution.reverseWords("")); // "" (empty string)
  console.log(solution.reverseWords("one two three four")); // "four three two one"
}
