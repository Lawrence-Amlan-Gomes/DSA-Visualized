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

Time Complexity : O(N)     — each character visited at most twice (right + left pointers)
Space Complexity: O(1)      — because we only have 26 uppercase letters (fixed size)

This is the optimal sliding window solution (NeetCode / standard interview approach)

*/

class Solution {
  /**
   * @param {string} s
   * @param {number} k
   * @return {number}
   */

  characterReplacement(s, k) {
    const count = new Map(); // frequency map for letters in current window
    let left = 0; // left pointer of the window
    let maxFrequency = 0; // most frequent letter count in current window
    let longest = 0; // longest valid window found so far
    for (let right = 0; right < s.length; right++) { // right pointer expands the window
      const char = s[right]; // current character at right pointer
      count.set(char, (count.get(char) || 0) + 1); /* If char not in map, we do 0 + 1, 
                                                      otherwise we increment the existing count */
      maxFrequency = Math.max(maxFrequency, count.get(char)); /* Update the highest frequency char
                                                                 in current window */
      while ((right - left + 1) - maxFrequency > k) { /* If the window size minus maxFrequency is 
        greater than k, it means the maxFrequency increased because of the right char, but the left 
        char is not the most frequent char or equal to maxFrequency, So we shrink the window 
        from the left and decrease the frequency of the left char in the current window */
        const leftChar = s[left];
        count.set(leftChar, count.get(leftChar) - 1);
        left++;
      }
      longest = Math.max(longest, right - left + 1); /* Update longest valid window size 
       after making the current window is valid form above steps */
    }
    return longest;
  }
  
}


// ────────────────────────────────────────────────
// Test Cases
// ────────────────────────────────────────────────
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

/*
Super easy explanation:

We want the longest window where at most k characters are different from the
most common character in that window.

So inside every window:
    → We count how many times each letter appears (frequency map)
    → We track the count of the most frequent letter (maxFrequency)

If the window size minus maxFrequency is greater than k, it means the maxFrequency
increased because of the right char, but the left char is not the most frequent char, 
So we shrink the window from the left and decrease the frequency of the left char 
until it's valid again.

*/

}