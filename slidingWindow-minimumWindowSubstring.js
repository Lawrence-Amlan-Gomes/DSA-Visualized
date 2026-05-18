// minimumWindowSubstring.js

export default function run() {
  /*

Minimum Window Substring

Given two strings s and t of lengths m and n respectively,
return the minimum window substring of s such that every character 
in t (including duplicates) is included in the window. 
If there is no such substring, return the empty string "".

The testcases will be generated such that the answer is unique.

Time Complexity : O(|s| + |t|)   — each char visited at most twice
Space Complexity: O(1)             — fixed alphabet size (assuming ASCII/English letters)

This is the classic sliding window with two frequency maps — standard optimal solution

*/

  class Solution {
    /**
     * @param {string} s
     * @param {string} t
     * @return {string}
     */

    minWindow(s, t) {
      if (t === "") return ""; // If t is empty, we can return an empty string as the minimum window
      const countT = {}; // frequency map for characters in t
      for (let char of t) { // now we do: key -> char, value -> frequency of that char in t
        countT[char] = (countT[char] || 0) + 1; /* If char not in map, we do 0 + 1, 
                                                      otherwise we increment the existing count */
      } // Example: t = "AABC" → countT = { A: 2, B: 1, C: 1 }
      const need = Object.keys(countT).length;/* number of unique chars we need to have in the window
                                                Example: t = "AABC" → need = 3 (A, B, C) */
      const window = {}; // frequency map for characters in the current window
      let have = 0; // how many unique chars in the current window meet the required frequency in t
      let result = [-1, -1]; // to store the start and end indices of the minimum window found
      let resultLength = Infinity; // to store the length of the minimum window found
      let left = 0; // left pointer of the sliding window, it will shrink later
      for (let right = 0; right < s.length; right++) { // right pointer expands the window
        const char = s[right]; // current character at right pointer
        window[char] = (window[char] || 0) + 1; /* If char not in map, we do 0 + 1, 
                                                      otherwise we increment the existing count */
        if (countT[char] && window[char] === countT[char]) { /* If the current window has the required
          frequency for this char, that means we one char that we need, So we can increment have */
          have++;
        }
        while (have === need && left <= right) { /* When the current window is valid */
          const currentLength = right - left + 1; // calculate the length of the current valid window
          if (currentLength < resultLength) { /* If the current valid window is smaller than 
            the previously found minimum window, we update our result and resultLength */
            resultLength = currentLength;
            result = [left, right];
          }
          const leftChar = s[left]; /* Now we need to shrink the window from the left to find the the 
                                       possible minimum window later */
          window[leftChar]--; // So we decrease the frequency of the left char in the current window
          if (countT[leftChar] && window[leftChar] < countT[leftChar]) { /* After decreasing the 
            frequency of the left char, if it becomes less than what we need in t,
            that means the current window is no longer valid, So we need to decrease have */
            have--;
          }
          left++; // Move the left pointer to shrink the window and continue the process
        }
      }
      return resultLength === Infinity ? "" : s.slice(result[0], result[1] + 1); 
      /* Now we have the optimal minimum window for return */
    }

  }

  // ────────────────────────────────────────────────
  // Test Cases
  // ────────────────────────────────────────────────
  const solution = new Solution();

  console.log(solution.minWindow("DAOBECODEBANCDNK", "ABC"));
  // Expected: "BANC"

  console.log(solution.minWindow("", "a"));

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

  /*

    When the current window is valid (have === need),
    we repeatedly try to shrink it from the left to make it as small as possible while still 
    containing all required characters from t.Each time we move the left pointer rightward:
    we decrease the count of the character we are removing (window[s[left]]--)
    if that character was one we needed (countT[s[left]] exists) and after decreasing its 
    count in the window it becomes less than what we need (window[s[left]] < countT[s[left]]),
    → then this window is no longer valid → we decrease have
    → and we stop shrinking (exit the while loop) because we've removed something essential
    Then we go back to expanding the right pointer to try to find another valid window.

*/
}
