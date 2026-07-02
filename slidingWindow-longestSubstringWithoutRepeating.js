// longestSubstringWithoutRepeating.js
export default function run() {
/*

Given a string s, find the length of the longest 
substring without repeating characters.

Time Complexity : O(N)    — each character is visited at most twice
Space Complexity: O(min(N, charset))   — worst case O(N) for the map

This is the optimal sliding window + hash map solution 
(standard NeetCode / LeetCode approach)

*/

class Solution {
  /**
   * @param {string} s
   * @return {number}
   */

  lengthOfLongestSubstring(s) {
    const charIndex = new Map(); // We use a Map to store the most recent index of each character
    let left = 0;           // left boundary of current window
    let maxLength = 0;      // global maximum length found
    // right pointer scans the string from left to right only once
    for (let right = 0; right < s.length; right++) {
      const currentChar = s[right]; // current character at right pointer
      if (charIndex.has(currentChar)) { /* If we've seen this character before, 
        we may need to move the left pointer, because we found a duplicate */
        left = Math.max(charIndex.get(currentChar) + 1, left); /* We are moving the left pointer 
        to the index right after the last occurrence of the duplicate character and 
        we are taking the maximum because we don't want to move left backwards */
      }
      charIndex.set(currentChar, right); /* Update the most recent index of the current character 
                                            in the map */
      maxLength = Math.max(maxLength, right - left + 1); /* compare current window size with 
      max length found so far and update if current window is larger */
    }
    return maxLength;
  }

}

// ────────────────────────────────────────────────
// Test Cases
// ────────────────────────────────────────────────
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

/*

We want a window that expands to the right as long as we see new characters, 
and shrinks from the left when we find a duplicate. 
After finding a duplicate, we make the left pointer jump to the index 
right after the last occurrence of that character, 
ensuring we always have a substring without repeating characters. 
We keep track of the maximum length of such substrings throughout the process.

*/

}