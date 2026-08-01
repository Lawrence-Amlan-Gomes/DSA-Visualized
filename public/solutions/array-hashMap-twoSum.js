// twoSum.js
export default function run() {
  /*

  Given an array of integers nums and an integer target,
  return indices of the two numbers such that they add up to target.
  You may assume that each input would have EXACTLY ONE solution,
  and you may not use the same element twice.

  Follow the discipline (Roadmap view → Phase 1 → Two Sum):
  1. Brute force first — comment its time and space complexity above it.
  2. Optimize — say what the brute force wastes.
  3. Re-derive complexity for the optimized version.
  4. Edge cases — duplicate values, target needs the same element twice.
  5. Run it here in LiveCoding, check DevTools.

  */

  class Solution {
    /**
     * @param {number[]} nums
     * @param {number} target
     * @return {number[]}
     */
    twoSum(nums, target) {
      // for (let i = 0; i < nums.length; i++) {
      //   for (let j = i + 1; j < nums.length; j++) {
      //     if (nums[i] + nums[j] === target) return [i, j];
      //   }
      // }
      // return [];
      const numToIndex = new Map();
      for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (numToIndex.has(complement)) {
          return [numToIndex.get(complement), i];
        }
        numToIndex.set(nums[i], i);
      }
      return [];
    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.twoSum([2, 7, 11, 15], 9)); // expect [0, 1]
  console.log(solution.twoSum([3, 2, 4], 6)); // expect [1, 2]
  console.log(solution.twoSum([3, 3], 6)); // expect [0, 1]
  console.log(solution.twoSum([1, 5, 3, 7, 9], 12)); // expect [1, 4]
}
