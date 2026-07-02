// reverseWords.js
export default function run() {
 /*
 Given an input string s, reverse the order of the words.
 A word is defined as a sequence of non-space characters.
 The words in s will be separated by at least one space.
 Return a string of the words in reverse order concatenated by a single space.
 
 Note that s may contain leading or trailing spaces or multiple spaces between two words.
 The returned string should only have a single space separating the words.
 Do not include any extra spaces.
 
 Time Complexity : O(n)
 Space Complexity: O(n)
 
 */

 class Solution {
  /**
   * @param {string} s
   * @return {string}
   */

  reverseWords(s) {
    // Category: Arrays + String manipulation
    const words = s.trim().split(/\s+/); /* Trim leading/trailing spaces and split by one or more 
                                            spaces to get words array */
    words.reverse(); // Reverse the array of words
    return words.join(' '); // Join the reversed array back into a string with single spaces
  }
  
 }

 // Test
 const solution = new Solution();

 console.log(solution.reverseWords("the sky is blue"));              // "blue is sky the"

 console.log(solution.reverseWords("  hello world  "));             // "world hello"
 console.log(solution.reverseWords("a good   example"));            // "example good a"
 console.log(solution.reverseWords("  Bob    Loves  Alice   "));    // "Alice Loves Bob"
 console.log(solution.reverseWords("Alice"));                       // "Alice"
 console.log(solution.reverseWords("    "));                        // "" (empty string)
 console.log(solution.reverseWords(""));                            // "" (empty string)
 console.log(solution.reverseWords("one two three four"));          // "four three two one"

 /*

  Easy explanation: First, we trim any extra spaces from the start and end. Then we split 
  the string by one or more spaces (this handles multiple spaces between words). We get 
  an array of words, reverse that array, and join them back together with single spaces. 
  This gives us the words in reverse order with proper spacing.

 */
}
