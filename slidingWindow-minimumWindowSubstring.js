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
      // if (t === "") return "";
      // const need = {};
      // for (const c of t) need[c] = (need[c] || 0) + 1;
      // let best = "";
      // for (let i = 0; i < s.length; i++) {
      //   const have = {};
      //   for (let j = i; j < s.length; j++) {
      //     have[s[j]] = (have[s[j]] || 0) + 1;
      //     const ok = Object.keys(need).every((c) => (have[c] || 0) >= need[c]);
      //     if (ok) {
      //       const candidate = s.slice(i, j + 1);
      //       if (!best || candidate.length < best.length) best = candidate;
      //       break;
      //     }
      //   }
      // }
      // return best;
      // Time: O(n² · |t|) — every start rescans forward, each check scans t's unique characters. Space: O(|t|) — the requirement map.

      if (t === "") return "";
      const countT = {};
      for (const c of t) countT[c] = (countT[c] || 0) + 1;
      const need = Object.keys(countT).length;
      const window = {};
      let have = 0,
        left = 0;
      let result = [-1, -1],
        resultLen = Infinity;
      for (let right = 0; right < s.length; right++) {
        const c = s[right];
        window[c] = (window[c] || 0) + 1;
        if (countT[c] && window[c] === countT[c]) have++;
        while (have === need) {
          if (right - left + 1 < resultLen) {
            resultLen = right - left + 1;
            result = [left, right];
          }
          const lc = s[left];
          window[lc]--;
          if (countT[lc] && window[lc] < countT[lc]) have--;
          left++;
        }
      }
      return resultLen === Infinity ? "" : s.slice(result[0], result[1] + 1);

      // Time: O(|s| + |t|) — building countT is O(|t|), and right/left each move forward across s at most once. Space: O(|s| + |t|) in the worst case for the two frequency maps (constant if the alphabet is fixed, e.g. ASCII).
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
