// minimumWindowSubstring.js

export default function run() {
  /*

Minimum Window Substring

Given two strings s and t of lengths m and n respectively,
return the minimum window substring of s such that every character
in t (including duplicates) is included in the window.
If there is no such substring, return the empty string "".

The testcases will be generated such that the answer is unique.

Time Complexity :
Space Complexity:

*/

  class Solution {
    /**
     * @param {string} s
     * @param {string} t
     * @return {string}
     */
    minWindow(s, t) {

    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.minWindow("DAOBECODEBANCDNK", "ABC"));
  // Expected: "BANC"

  console.log(solution.minWindow("", "a"));
  // Expected: ""

  console.log(solution.minWindow("a", "aa"));
  // Expected: ""

  console.log(solution.minWindow("ab", "b"));
  // Expected: "b"

  console.log(solution.minWindow("aaaaaaaaaaa", "aa"));
  // Expected: "aa"

  console.log(solution.minWindow("cabwefgewcwaefgcf", "cae"));
  // Expected: "cwae"  (or any minimal valid window of length 4)

  console.log(solution.minWindow("", "abc"));
  // Expected: ""

  console.log(solution.minWindow("abc", ""));
  // Expected: ""

  console.log(solution.minWindow("bba", "ab"));
  // Expected: "ba"
}
