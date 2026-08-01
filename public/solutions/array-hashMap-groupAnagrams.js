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

  Follow the discipline (Roadmap view → Phase 1 → Group Anagrams):
  1. Brute force first — comment its time and space complexity above it.
  2. Optimize — say what the brute force wastes.
  3. Re-derive complexity for the optimized version.
  4. Edge cases — empty array, empty string, no anagram partners, one big family.
  5. Run it here in LiveCoding, check DevTools.

  */

  class Solution {
    /**
     * @param {string[]} strs
     * @return {string[][]}
     */
    groupAnagrams(strs) {
      // const groups = {};
      // for (const s of strs) {
      //   const key = s.split("").sort().join("");
      //   if (!groups[key]) groups[key] = [];
      //   groups[key].push(s);
      // }
      // return Object.values(groups);
      // Time: O(n · k log k) — n words, each sorted in O(k log k) for word length k. Space: O(n · k) — the map ends up holding every word.

      const groups = {};
      for (const s of strs) {
        const count = new Array(26).fill(0);
        for (const ch of s) count[ch.charCodeAt(0) - 97]++;
        const key = count.join(",");
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      }
      return Object.values(groups);
      // Time: O(n · k) — one pass counting each word's 26 letters, no sort. Space: O(n · k) — same map, plus a fixed 26-length array per word.
    }
  }

  // Test
  const solution = new Solution();

  console.log(
    solution.groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]),
  );
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
