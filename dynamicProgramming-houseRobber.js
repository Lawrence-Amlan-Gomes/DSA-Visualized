// houseRobber.js
export default function run() {
  /*
You are a professional robber planning to rob houses along a street.
Each house has a certain amount of money stashed, the only constraint stopping you
from robbing each of them is that adjacent houses have security systems connected
and it will automatically contact the police if two adjacent houses were broken into on the same night.

Given an integer array nums representing the amount of money of each house,
return the maximum amount of money you can rob tonight without alerting the police.

Example 1:
Input: nums = [1,2,3,1]
Output: 4
Explanation: Rob house 1 (money = 1) and then rob house 3 (money = 3).
Total amount you can rob = 1 + 3 = 4.

Example 2:
Input: nums = [2,7,9,3,2]
Output: 13
Explanation: Rob house 1 (money = 2), rob house 3 (money = 9) and rob house 5 (money = 2).
Total amount you can rob = 2 + 9 + 2 = 13.

Example 3:
Input: nums = [1,2,3]
Output: 4

Time Complexity : ?
Space Complexity: ?

*/

  class Solution {
    /**
     * @param {number[]} nums
     * @return {number}
     */

    rob(nums) {
      // if (i >= nums.length) return 0;
      // const robThis = nums[i] + rob(nums, i + 2);
      // const skipThis = rob(nums, i + 1);
      // return Math.max(robThis, skipThis);
      // Time: O(2²) — branching factor 2, depth n, since the same sub-arrays get re-solved repeatedly. Space: O(n) — the recursion stack.

      let rob1 = 0,
        rob2 = 0;
      for (const num of nums) {
        const temp = Math.max(num + rob1, rob2);
        rob1 = rob2;
        rob2 = temp;
      }
      return rob2;
      // Time: O(n) — one pass. Space: O(1) — two rolling variables, no array.
    }
  }

  // Test cases
  const solution = new Solution();

  console.log(solution.rob([1, 2, 3, 1])); // Expected: 4
  console.log("");
  console.log("");

  console.log(solution.rob([2, 7, 9, 5, 2])); // Expected: 13

  console.log("");
  console.log("");

  console.log(solution.rob([1, 2, 3])); // Expected: 4
  console.log("");
  console.log("");

  console.log(solution.rob([2, 1, 1, 2])); // Expected: 4 (2 + 2)
  console.log("");
  console.log("");

  console.log(solution.rob([1])); // Expected: 1
  console.log("");
  console.log("");

  console.log(solution.rob([1, 100, 1])); // Expected: 100 (rob house 2 alone; houses 1+3 only sum to 2)
  console.log("");
  console.log("");

  console.log(solution.rob([10, 1, 10, 1, 10])); // Expected: 30
}
