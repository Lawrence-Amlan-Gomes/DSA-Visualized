// longestSubstringWithoutRepeating.js
export default function run() {
  /*

Given a string s, find the length of the longest
substring without repeating characters.

Time Complexity :
Space Complexity:

*/

  class Solution {
    /**
     * @param {string} s
     * @return {number}
     */
    lengthOfLongestSubstring(s) {
      // let res = 0;
      // for (let i = 0; i < s.length; i++) {
      //   const seen = new Set();
      //   for (let j = i; j < s.length; j++) {
      //     if (seen.has(s[j])) break;
      //     seen.add(s[j]);
      //     res = Math.max(res, j - i + 1);
      //   }
      // }
      // return res;
      // Time: O(n²) — every starting point rescans forward. Space: O(min(n, charset)) — the seen set per start.

      const lastSeen = new Map();
      let left = 0,
        maxLen = 0;
      for (let right = 0; right < s.length; right++) {
        const c = s[right];
        if (lastSeen.has(c)) {
          left = Math.max(lastSeen.get(c) + 1, left);
        }
        lastSeen.set(c, right);
        maxLen = Math.max(maxLen, right - left + 1);
      }
      return maxLen;
    }
    // Time: O(n) — each character is visited by right exactly once. Space: O(min(n, charset)) — the map holds at most one entry per distinct character.
  }

  // Test
  const solution = new Solution();

  console.log(solution.lengthOfLongestSubstring("abcdaefghbcbb"));
  // Expected: 8     ("daefghbc")

  console.log(solution.lengthOfLongestSubstring("bbbbb"));
  // Expected: 1     ("b")

  console.log(solution.lengthOfLongestSubstring("pwwkew"));
  // Expected: 3     ("wke")

  console.log(solution.lengthOfLongestSubstring(""));
  // Expected: 0

  console.log(solution.lengthOfLongestSubstring(" "));
  // Expected: 1

  console.log(solution.lengthOfLongestSubstring("au"));
  // Expected: 2     ("au")

  console.log(solution.lengthOfLongestSubstring("dvdf"));
  // Expected: 3     ("vdf")

  console.log(solution.lengthOfLongestSubstring("abba"));
  // Expected: 2     ("ab" or "ba")

  console.log(solution.lengthOfLongestSubstring("tmmzuxt"));
  // Expected: 5     ("mzuxt")
}
