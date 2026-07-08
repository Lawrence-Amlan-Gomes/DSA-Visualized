// longestRepeatingCharacterReplacement.js
export default function run() {
  /*

Longest Repeating Character Replacement

You are given a string s consisting of only uppercase English letters.
You can perform at most k operations on that string:
  → In one operation, you can choose any character of the string
  and change it to any other uppercase English character.

Return the length of the longest substring containing the same letter
you can get after performing the above operations at most k times.

Time Complexity :
Space Complexity:

*/

  class Solution {
    /**
     * @param {string} s
     * @param {number} k
     * @return {number}
     */
    characterReplacement(s, k) {
      //   let res = 0;
      //   for (let i = 0; i < s.length; i++) {
      //     const count = new Map();
      //     let maxFreq = 0;
      //     for (let j = i; j < s.length; j++) {
      //       count.set(s[j], (count.get(s[j]) || 0) + 1);
      //       maxFreq = Math.max(maxFreq, count.get(s[j]));
      //       if ((j - i + 1) - maxFreq <= k) {
      //         res = Math.max(res, j - i + 1);
      //       }
      //     }
      //   }
      //   return res;
      // Time: O(n²) — every start rescans forward. Space: O(1) — at most 26 letters tracked.

      const count = new Map();
      let left = 0,
        maxFrequency = 0,
        longest = 0;
      for (let right = 0; right < s.length; right++) {
        const c = s[right];
        count.set(c, (count.get(c) || 0) + 1);
        maxFrequency = Math.max(maxFrequency, count.get(c));
        while (right - left + 1 - maxFrequency > k) {
          const lc = s[left];
          count.set(lc, count.get(lc) - 1);
          left++;
        }
        longest = Math.max(longest, right - left + 1);
      }
      return longest;
    }
    // Time: O(n) — right moves forward n times, left moves forward at most n times total. Space: O(1) — the count map holds at most 26 uppercase letters.
  }

  // Test
  const solution = new Solution();

  console.log(solution.characterReplacement("ABAB", 2));
  // Expected: 4    → "AAAA" or "BBBB" after 2 changes

  console.log(solution.characterReplacement("AABDBBBC", 2));
  // Expected: 6    → "ABDBBB" → change to → "BBBBBB"

  console.log(solution.characterReplacement("AAAA", 2));
  // Expected: 4    → already all same, no change needed

  console.log(solution.characterReplacement("ABBB", 2));
  // Expected: 4    → change A to B → "BBBB"

  console.log(solution.characterReplacement("BAAA", 0));
  // Expected: 3    → "AAA" (can't change anything)

  console.log(solution.characterReplacement("A", 0));
  // Expected: 1

  console.log(solution.characterReplacement("", 5));
  // Expected: 0

  console.log(solution.characterReplacement("ABCDE", 1));
  // Expected: 2    → any two same after one change (e.g. "AABC" → change B to A)
}
