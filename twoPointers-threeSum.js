// threeSum.js
import print from "./script.js";

export default function run() {
  /*

Given an integer array nums, return all the triplets
[nums[i], nums[j], nums[k]] such that i != j, i != k, j != k
and nums[i] + nums[j] + nums[k] == 0.

The solution set must not contain duplicate triplets.

Example 1:
Input: nums = [-1,0,1,2,-1,-4]
Output: [[-1,-1,2],[-1,0,1]]

Time Complexity :
Space Complexity:

*/

  class Solution {
    /**
     * @param {number[]} nums
     * @return {number[][]}
     */
    threeSum(nums) {
      // const seen = new Set();
      // const res = [];
      // for (let i = 0; i < nums.length; i++) {
      //   for (let j = i + 1; j < nums.length; j++) {
      //     for (let k = j + 1; k < nums.length; k++) {
      //       if (nums[i] + nums[j] + nums[k] === 0) {
      //         const key = [nums[i], nums[j], nums[k]]
      //           .sort((a, b) => a - b)
      //           .join(",");
      //         if (!seen.has(key)) {
      //           seen.add(key);
      //           res.push([nums[i], nums[j], nums[k]]);
      //         }
      //       }
      //     }
      //   }
      // }
      // return res;
      // Time: O(n³) — three nested loops. Space: O(n) — the dedup set, on top of the output.

      nums.sort((a, b) => a - b);
      const res = [];
      for (let i = 0; i < nums.length; i++) {
        if (i > 0 && nums[i] === nums[i - 1]) continue;
        if (nums[i] > 0) break;
        let l = i + 1,
          r = nums.length - 1;
        while (l < r) {
          const sum = nums[i] + nums[l] + nums[r];
          if (sum < 0) l++;
          else if (sum > 0) r--;
          else {
            res.push([nums[i], nums[l], nums[r]]);
            l++;
            r--;
            while (l < r && nums[l] === nums[l - 1]) l++;
            while (l < r && nums[r] === nums[r + 1]) r--;
          }
        }
      }
      return res;
      // Time: O(n²) — O(n log n) to sort, then O(n) outer loop each running an O(n) two-pointer sweep. Space: O(1) extra besides the output (or O(n)/O(log n) depending on the sort's internals — no extra data structure either way).
    }
  }

  // Test
  const solution = new Solution();

  print(solution.threeSum([-1, 0, 1, 2, -1, -4]));
  // Expected: [[-1,-1,2],[-1,0,1]] (any order of triplets is fine)

  print(solution.threeSum([0, 1, 1]));
  // Expected: []

  print(solution.threeSum([0, 0, 0]));
  // Expected: [[0,0,0]]

  print(solution.threeSum([-2, 0, 1, 1, 2]));
  // Expected: [[-2,0,2],[-2,1,1]]

  print(solution.threeSum([1, 2, -2, -1]));
  // Expected: []

  print(solution.threeSum([-1, -1, 0, 1, 2]));
  // Expected: [[-1,-1,2],[-1,0,1]]

  print(solution.threeSum([3, 0, -2, -1, 1, 2]));
  // Expected: [[-2,-1,3],[-2,0,2],[-1,0,1]]
}
