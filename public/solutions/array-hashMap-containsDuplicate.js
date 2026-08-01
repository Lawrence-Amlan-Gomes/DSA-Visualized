// hasDuplicate.js
export default function run() {
  /*

  Given an integer array nums, return true if any value appears at least twice
  in the array, and return false if every element is distinct.

  Follow the discipline (Roadmap view → Phase 1 → Contains Duplicate):
  1. Brute force first — comment its time and space complexity above it.
  2. Optimize — say what the brute force wastes.
  3. Re-derive complexity for the optimized version.
  4. Edge cases — empty array, single element, all duplicates.
  5. Run it here in LiveCoding, check DevTools.

  */

  class Solution {
    /**
     * @param {number[]} nums
     * @return {boolean}
     */
    hasDuplicate(nums) {
      const seen = new Set();
      for (const n of nums) {
        if (seen.has(n)) return true;
        seen.add(n);
      }
      return false;
    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.hasDuplicate([1, 2, 3, 1])); // expect true
  console.log(solution.hasDuplicate([1, 2, 3, 4])); // expect false
  console.log(solution.hasDuplicate([1, 1, 1, 3, 3, 4, 3, 2, 4, 2])); // expect true
  console.log(solution.hasDuplicate([1])); // expect false
  console.log(solution.hasDuplicate([])); // expect false
}
