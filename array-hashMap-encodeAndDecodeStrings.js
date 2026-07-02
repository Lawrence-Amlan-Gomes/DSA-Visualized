// encodeAndDecodeStrings.js
export default function run() {
/*
 
Design an algorithm to encode a list of strings to a single string.
The encoded string is then sent over the network and is decoded back to the original list of strings.
 
You may assume the string may contain any possible characters including special characters like '#'.

Example 1:
Input: ["Hello","World"]
Output: ["Hello","World"]

Example 2:
Input: [""]
Output: [""]

Example 3:
Input: ["a","b","c"]    
Output: ["a","b","c"]

Time Complexity : O(N) for both encode and decode (N = total characters across all strings)
Space Complexity: O(N)

This is the OPTIMAL & MOST COMPACT solution (length-prefixed encoding with '#' delimiter).
Handles ANY characters (including '#', numbers, empty strings) perfectly.
 
*/
 
class Solution {


  encode(strs) {
    // Category: String Encoding (length prefix + delimiter trick)
    // Step 1: Build encoded string by prefixing each string with its length + '#'
    // Example: ["Hello","World"] → "5#Hello5#World"
    let res = '';
    for (let s of strs) {
      res += s.length + '#' + s;
    }
    return res;
  }
  decode(str) {
    // Category: String Decoding (parse length prefix)
    let res = []; // For storing decoded strings
    let i = 0;    // Pointer to current position in the encoded string
    while (i < str.length) {
      /* Step 1: Find position of next '#' to extract the length */
      // If str = "5#Hello5#World"
      let j = i; // j is 0 first,
      while (str[j] !== '#') {
        j++; // We need to move j until we find the '#' that comes after the length prefix
      }
      let length = parseInt(str.substring(i, j)); 
      // We find the length by taking the substring from i to j and parsing it as an integer
      /* Step 2: Move pointers and extract the exact substring */
      i = j + 1; // Move past the '#' to the start of the actual string
      j = i + length; // The end index of the string is start index (i) + length
      res.push(str.substring(i, j)); // We got the original string, add it to the result
      // Step 3: Continue from the end of this string
      i = j; 
      // if we make i = j, we are now doing the same thing for the next string when the loop continues
    }
    return res;
  }
 
}
 
// Test
const solution = new Solution();
 
// Test encode → decode roundtrip
let strs1 = ["Hello","World"];
console.log(solution.decode(solution.encode(strs1)));
// Expected: ["Hello","World"]
 
console.log(solution.decode(solution.encode([""])));                    // [""]
 
console.log(solution.decode(solution.encode(["a","b","c"])));           // ["a","b","c"]
 
console.log(solution.decode(solution.encode(["hello#world","test"])));  // ["hello#world","test"]
 
console.log(solution.decode(solution.encode(["","abc","def#ghi",""]))); // ["","abc","def#ghi",""]
 
console.log(solution.decode(solution.encode(["123","4#5",""])));        // ["123","4#5",""]
 
console.log(solution.decode(solution.encode([])));                      // []
 
 
/*

To safely send a list of strings as one single string (even if strings contain special 
characters like '#'), we "prefix" each string with its exact length followed by a '#'.  
Example: "Hello" → "5#Hello",   "hi#there" → "8#hi#there",   "" → "0#"
Encoding: just glue length + '#' + string for every string.  
Decoding: read the number before each '#" to know exactly how many characters to take next — 
no confusion even with special chars or empty strings.
Super reliable, handles any characters, and stays very efficient (one pass each way).

*/
 
}