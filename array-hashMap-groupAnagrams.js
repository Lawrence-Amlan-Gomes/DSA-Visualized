// groupAnagrams.js
export default function run() {
  /*

 Given an array of strings strs, group the anagrams together.
 You can return the answer in any order.
 
 An Anagram is a word or phrase formed by rearranging the letters 
 of a different word or phrase, typically using all the original 
 letters exactly once.

 Example 1:
  Input: strs = ["eat","tea","tan","ate","nat","bat"]
  Output: [["bat"],["nat","tan"],["ate","eat","tea"]]
  
 Example 2:
  Input: strs = [""]  
  Output: [[""]]

 Example 3:
  Input: strs = ["a"] 
  Output: [["a"]]
 
 Time Complexity : O(N × K)    [N = number of strings, K = max length of any string]
 Space Complexity:
   • O(N × K) extra space (for the hash map + count arrays)
   • O(N × K) space for the output list (we have to return all strings anyway)
 
 This is the OPTIMAL solution (much better than sorting each string).

 */

  class Solution {
    /**
     * @param {string[]} strs
     * @return {string[][]}
     */

    groupAnagrams(strs) {
      // Category: Arrays + HashMap (frequency count signature)
      // Step 1: Create a plain object as our hash map
      // Key = frequency signature string, Value = array of anagrams
      const res = {};
      // Step 2: Process every string in one pass
      for (let s of strs) {
        // Step 3: Build frequency count for 26 lowercase letters only
        // beacause problem states input is lowercase letters
        const count = new Array(26).fill(0);
        for (let c of s) {
          // Convert char to index 0-25: 'a' → 0, 'b' → 1, ...
          count[c.charCodeAt(0) - "a".charCodeAt(0)] += 1;
        }
        // Step 4: Create a unique key from the count array
        // Example: [1,0,0,...,1] becomes "1,0,0,...,1"; length is fixed at 26
        // This is the same for ALL anagrams → perfect hash key
        const key = count.join(",");
        // Step 5: If this group doesn't exist yet, initialize it
        if (!res[key]) {
          res[key] = [];
        }
        // Step 6: If this group exists, add the original string to its anagram group
        res[key].push(s);
      }
      // Step 7: Return all groups (Object.values gives us the arrays)
      return Object.values(res);
    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]));
  // Expected: [["eat","tea","ate"],["tan","nat"],["bat"]] (any order)

  console.log(solution.groupAnagrams([""])); // [[""]]
  console.log(solution.groupAnagrams(["a"])); // [["a"]]
  console.log(solution.groupAnagrams([])); // []
  console.log(solution.groupAnagrams(["abc", "def", "cba", "fed"]));
  // Expected: [["abc","cba"],["def","fed"]]
  console.log(solution.groupAnagrams(["ab", "ba", "abc", "cab"]));
  // Expected: [["ab","ba"],["abc","cab"]]
  console.log(solution.groupAnagrams(["hello", "world", "lloeh", "dlrow"]));
  // Expected: [["hello","lloeh"],["world","dlrow"]]

}
