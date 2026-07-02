// firstUniqChar.js
export default function run() {
 /*
 Given a string s, find the first non-repeating character in it and return its index. 
 If it does not exist, return -1.
 
 Time Complexity : O(n)
 Space Complexity: O(1) - since character set is bounded (26 letters for English)
 
 */

 class Solution {
  /**
   * @param {string} s
   * @return {number}
   */

  firstUniqChar(s) {
    // Category: Arrays + HashMap (frequency counter with index tracking)
    const n = s.length; // Get string length for bounds checking
    const count = new Map(); // Map to store first occurrence index or mark as invalid

    for (let i = 0; i < n; i++) { // Iterate through the string
      const c = s[i]; // Get current character
      if (!count.has(c)) { // First time seeing this character
        count.set(c, i); // Store index of first occurrence
      } else {
        count.set(c, n); // Mark as invalid by setting index to n
      }
    }
    let res = n; // Initialize result to n (out of bounds index)
    for (const index of count.values()) { // Iterate through stored indices
      res = Math.min(res, index); // Update result with the smallest valid index
    }
    return res === n ? -1 : res; // If result is still n, return -1, otherwise return result
  }
  
 }

 // Test
 const solution = new Solution();

 console.log(solution.firstUniqChar("leetcode"));             // 0 (l is first unique)

 console.log(solution.firstUniqChar("loveleetcode"));        // 2 (v is first unique)

 console.log(solution.firstUniqChar("aabb"));                // -1 (no unique character)
 console.log(solution.firstUniqChar(""));                    // -1 (empty string)
 console.log(solution.firstUniqChar("z"));                   // 0 (single character)
 console.log(solution.firstUniqChar("aadadaad"));            // -1
 console.log(solution.firstUniqChar("abcabcde"));            // 6 (e is first unique)
 console.log(solution.firstUniqChar("cccaab"));              // 4 (a is first unique)

 /*

  Easy explanation: We scan the string once and store the index of each character 
  the first time we see it. If we see the same character again, we mark it as "invalid" 
  by setting its stored index to n (the string length, which is out of bounds). After 
  the scan, we look for the smallest valid index. If all indices are n (meaning all 
  characters repeated), we return -1. This gives us the first non-repeating character 
  in a single pass with constant space for the character set.

 */
}
