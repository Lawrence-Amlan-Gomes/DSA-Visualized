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

*/

  class Solution {
    encode(strs) {
      let res = "";
      for (const s of strs) {
        res += s.length + "#" + s;
      }
      return res;
    }

    decode(str) {
      const res = [];
      let i = 0;
      while (i < str.length) {
        let j = i;
        while (str[j] !== "#") j++;
        const length = parseInt(str.substring(i, j));
        i = j + 1;
        j = i + length;
        res.push(str.substring(i, j));
        i = j;
      }
      return res;
    }
    // Time: O(n) for encode and decode, where n is the total number of characters across all strings — each character is visited a constant number of times. Space: O(n) — the encoded string and the output array.
  }

  // Test
  const solution = new Solution();

  // Test encode → decode roundtrip
  let strs1 = ["Hello", "World"];
  console.log(solution.decode(solution.encode(strs1)));
  // Expected: ["Hello","World"]

  console.log(solution.decode(solution.encode([""]))); // [""]

  console.log(solution.decode(solution.encode(["a", "b", "c"]))); // ["a","b","c"]

  console.log(solution.decode(solution.encode(["hello#world", "test"]))); // ["hello#world","test"]

  console.log(solution.decode(solution.encode(["", "abc", "def#ghi", ""]))); // ["","abc","def#ghi",""]

  console.log(solution.decode(solution.encode(["123", "4#5", ""]))); // ["123","4#5",""]

  console.log(solution.decode(solution.encode([]))); // []
}
