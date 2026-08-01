// searchInRotatedSortedArray.js

export default function run() {
  /*
Search in Rotated Sorted Array

Given an integer array nums sorted in ascending order (with distinct values)
that has been rotated at some unknown pivot index k (1 <= k < nums.length),
return the index of target if it exists in nums, or -1 if it does not.

You must write an algorithm with O(log n) runtime complexity.

Time Complexity :
Space Complexity:
*/

  class Solution {
    /**
     * @param {number[]} nums
     * @param {number} target
     * @return {number}
     */

    search(nums, target) {
      // for (let i = 0; i < nums.length; i++) {
      //   if (nums[i] === target) return i;
      // }
      // return -1;
      // Time: O(n) — worst case checks every element. Space: O(1).

      let l = 0,
        r = nums.length - 1;
      while (l <= r) {
        const mid = Math.floor((l + r) / 2);
        if (nums[mid] === target) return mid;
        if (nums[l] <= nums[mid]) {
          if (target > nums[mid] || target < nums[l]) {
            l = mid + 1;
          } else {
            r = mid - 1;
          }
        } else {
          if (target < nums[mid] || target > nums[r]) {
            r = mid - 1;
          } else {
            l = mid + 1;
          }
        }
      }
      return -1;
      // Time: O(log n) — the search space halves every step, same as plain binary search. Space: O(1) — three integer pointers.
    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.search([4, 5, 6, 7, 0, 1, 2], 0));
  // Expected: 4

  console.log(solution.search([4, 5, 6, 7, 0, 1, 2], 3));
  // Expected: -1

  console.log(solution.search([1], 1));
  // Expected: 0

  console.log(solution.search([1, 2], 1));
  // Expected: 0

  console.log(solution.search([5, 1, 2, 3, 4], 3));
  // Expected: 3

  console.log(solution.search([3, 4, 5, 1, 2], 1));
  // Expected: 3

  console.log(solution.search([11, 13, 15, 17], 13));
  // Expected: 1

  console.log(solution.search([1, 2, 3, 4, 5], 3));
  // Expected: 2

  console.log(solution.search([4, 5, 6, 7, 0, 1, 2], 7));
  // Expected: 3

  console.log(solution.search([4, 5, 6, 7, 0, 1, 2], 6));
  // Expected: 2

  console.log(solution.search([2, 1], 1));
  // Expected: 1

  console.log(solution.search([3, 1], 3));
  // Expected: 0

  console.log(solution.search([1, 2, 3], 4));
  // Expected: -1
}
