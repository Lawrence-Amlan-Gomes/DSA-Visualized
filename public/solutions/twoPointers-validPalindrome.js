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

Time Complexity :
Space Complexity:

*/

  class Solution {
    /**
     * @param {string} s
     * @return {boolean}
     */
    isPalindrome(s) {
      // const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, "");
      // return cleaned === cleaned.split("").reverse().join("");
      // Time: O(n) — one pass to clean, one pass to reverse/compare. Space: O(n) — the cleaned string and its reverse are new arrays/strings the size of the input.

      let l = 0,
        r = s.length - 1;
      const alphaNum = (c) => /[a-z0-9]/i.test(c);
      while (l < r) {
        while (l < r && !alphaNum(s[l])) l++;
        while (r > l && !alphaNum(s[r])) r--;
        if (s[l].toLowerCase() !== s[r].toLowerCase()) return false;
        l++;
        r--;
      }
      return true;

      // Time: O(n) — same as brute force, each character is visited at most twice. Space: O(1) — only two pointers, no second string built. The win here is real: no extra memory, and it's the pattern (two pointers converging from both ends) that shows up again and again in this category.
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
}
