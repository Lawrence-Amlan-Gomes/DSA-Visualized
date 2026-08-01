// validAnagram.js
export default function run() {
  /*

  Given two strings s and t, return true if t is an anagram of s,
  and false otherwise.

  An anagram is a word or phrase formed by rearranging the letters
  of a different word or phrase, using all the original letters exactly once.

  Follow the discipline (Roadmap view → Phase 1 → Valid Anagram):
  1. Brute force first — comment its time and space complexity above it.
  2. Optimize — say what the brute force wastes.
  3. Re-derive complexity for the optimized version.
  4. Edge cases — empty strings, different lengths, repeated letters.
  5. Run it here in LiveCoding, check DevTools.

  */

  class Solution {
    /**
     * @param {string} s
     * @param {string} t
     * @return {boolean}
     */
    isAnagram(s, t) {
      // if (s.length !== t.length) return false;
      // const sortedS = s.split("").sort().join("");
      // const sortedT = t.split("").sort().join("");
      // return sortedS === sortedT;
      if (s.length !== t.length) return false;
      const count = {};
      for (const ch of s) count[ch] = (count[ch] || 0) + 1;
      for (const ch of t) {
        if (!count[ch]) return false;
        count[ch]--;
      }
      return true;
    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.isAnagram("anagram", "nagaram")); // expect true
  console.log(solution.isAnagram("rat", "car")); // expect false
  console.log(solution.isAnagram("a", "a")); // expect true
  console.log(solution.isAnagram("", "")); // expect true
  console.log(solution.isAnagram("ab", "ba")); // expect true
  console.log(solution.isAnagram("hello", "world")); // expect false
  console.log(solution.isAnagram("abc", "ab")); // expect false (length diff)
}
