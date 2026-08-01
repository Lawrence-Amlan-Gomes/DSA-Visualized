// firstUniqChar.js
export default function run() {
  /*
 Given a string s, find the first non-repeating character in it and return its index.
 If it does not exist, return -1.
 */

  class Solution {
    /**
     * @param {string} s
     * @return {number}
     */

    firstUniqChar(s) {
      //   for (let i = 0; i < s.length; i++) {
      //     let unique = true;
      //     for (let j = 0; j < s.length; j++) {
      //       if (j !== i && s[j] === s[i]) { unique = false; break; }
      //     }
      //     if (unique) return i;
      //   }
      //   return -1;

      // Time: O(n²) — a full inner scan for every character. Space: O(1).

      const count = new Map();
      for (const c of s) count.set(c, (count.get(c) || 0) + 1);

      for (let i = 0; i < s.length; i++) {
        if (count.get(s[i]) === 1) return i;
      }
      return -1;

      // Time: O(n) — two linear passes. Space: O(1) when the alphabet is a fixed size (26 lowercase letters), since the count map can never hold more than 26 entries no matter how long the string is. With arbitrary Unicode input, this would become O(n) space instead — same reasoning as Contains Duplicate's fixed-alphabet trick.
    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.firstUniqChar("leetcode")); // 0 (l is first unique)

  console.log(solution.firstUniqChar("loveleetcode")); // 2 (v is first unique)

  console.log(solution.firstUniqChar("aabb")); // -1 (no unique character)
  console.log(solution.firstUniqChar("")); // -1 (empty string)
  console.log(solution.firstUniqChar("z")); // 0 (single character)
  console.log(solution.firstUniqChar("aadadaad")); // -1
  console.log(solution.firstUniqChar("abcabcde")); // 6 (d is first unique — a,b,c all repeat; e is unique too but comes after d)
  console.log(solution.firstUniqChar("cccaab")); // 5 (b is first unique — c and a both repeat)
}
