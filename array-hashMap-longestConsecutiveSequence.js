// longestConsecutiveSequence.js

export default function run() {
  /*

Given an unsorted array of integers nums, return the length of the longest
consecutive elements sequence. You must write an algorithm that runs in O(n) time.

Example 1:
Input: nums = [100,4,200,1,3,2]
Output: 4

*/

  class Solution {
    /**
     * @param {number[]} nums
     * @return {number}
     */

    longestConsecutive(nums) {
      //   if (nums.length === 0) return 0;
      //   const sorted = [...new Set(nums)].sort((a, b) => a - b);
      //   let longest = 1, current = 1;
      //   for (let i = 1; i < sorted.length; i++) {
      //     if (sorted[i] === sorted[i - 1] + 1) {
      //       current++;
      //     } else {
      //       current = 1;
      //     }
      //     longest = Math.max(longest, current);
      //   }
      //   return longest;

      // Time: O(n log n) — the sort dominates. Space: O(n) — the deduplicated, sorted copy.

      const set = new Set(nums);
      let longest = 0;
      for (const n of set) {
        if (!set.has(n - 1)) {
          let length = 1;
          while (set.has(n + length)) length++;
          longest = Math.max(longest, length);
        }
      }
      return longest;

      // Time: O(n) — every number is visited once as a candidate, and the inner while loop only ever runs for numbers that are true run starts, so the total expansion work across all runs is also O(n). Space: O(n) — the set.
    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.longestConsecutive([100, 4, 200, 1, 3, 2]));
  // Expected: 4

  console.log(solution.longestConsecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1]));
  // Expected: 9

  console.log(solution.longestConsecutive([1])); // 1

  console.log(solution.longestConsecutive([])); // 0

  console.log(solution.longestConsecutive([1, 2, 0, 1])); // 3

  console.log(solution.longestConsecutive([9, 1, 4, 7, 3, -1, 0, 5, 8, -1, 6]));
  // Expected: 7 (unique sorted: -1,0,1,3,4,5,6,7,8,9 — gap at 2, so longest run is 3-4-5-6-7-8-9)

  console.log(solution.longestConsecutive([1, 3, 5, 7, 9]));
  // Expected: 1
}
