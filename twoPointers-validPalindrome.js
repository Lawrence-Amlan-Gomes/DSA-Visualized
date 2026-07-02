// validPalindrome.js
export default function run() {
/*

Given a string s, return true if it is a palindrome after converting 
all uppercase letters into lowercase letters and removing all 
non-alphanumeric characters.

A phrase is a palindrome if, after converting all uppercase letters 
into lowercase letters and removing all non-alphanumeric characters, 
it reads the same forward and backward. Alphanumeric characters 
include letters and numbers.

Time Complexity : O(N)     [N = length of string — each char visited at most twice]
Space Complexity: O(1)     [only two pointers, no extra data structures]

This is the OPTIMAL two-pointer solution (in-place, no string cleaning needed).

*/

class Solution {
  /**
   * @param {string} s
   * @return {boolean}
   */
  
  isPalindrome(s) {
    // Category: Two Pointers (Very High Frequency)
    // Step 1: Initialize left (start) and right (end) pointers
    let l = 0,
        r = s.length - 1;

    while (l < r) {
      // Step 2: Move left pointer right until we find an alphanumeric char
      while (l < r && !this.alphaNum(s[l])) {
        l++;
      }
      // Step 3: Move right pointer left until we find an alphanumeric char
      while (r > l && !this.alphaNum(s[r])) {
        r--;
      }
      // Step 4: Compare both chars (case-insensitive)
      if (s[l].toLowerCase() !== s[r].toLowerCase()) {
        return false;
      }
      // Step 5: Move both pointers toward center
      l++;
      r--;
    }
    // Step 6: If we never found a mismatch, it's a palindrome
    return true;
  }

  /**
   * @param {char} c
   * @return {boolean}
   */

  alphaNum(c) {
    return (
      (c >= 'A' && c <= 'Z') ||
      (c >= 'a' && c <= 'z') ||
      (c >= '0' && c <= '9')
    );
  }

}

// Test
const solution = new Solution();

console.log(solution.isPalindrome("A man, a plan, a canal: Panama"));
// Expected: true

console.log(solution.isPalindrome("race a car"));
// Expected: false
console.log(solution.isPalindrome(" "));
// Expected: true
console.log(solution.isPalindrome(""));
// Expected: true
console.log(solution.isPalindrome("a"));
// Expected: true
console.log(solution.isPalindrome("ab"));
// Expected: false
console.log(solution.isPalindrome("121"));
// Expected: true
console.log(solution.isPalindrome("0P"));
// Expected: false
console.log(solution.isPalindrome("Madam, I'm Adam"));
// Expected: true
console.log(solution.isPalindrome("Was it a car or a cat I saw?"));
// Expected: true

/* 

We use two pointers — one starting from the beginning (left) and one from the end (right).  
We move them toward the center, but we skip any character that is not a letter or number.  
For each pair of valid characters we find, we compare them (ignoring case — both turned to 
lowercase). If they don’t match at any point → not a palindrome.  
If we successfully meet in the middle without any mismatch → it is a palindrome.

*/
}