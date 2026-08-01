// houseRobberII.js

export default function run() {
  /*
You are a professional robber planning to rob houses along a street.
Each house has a certain amount of money stashed. All houses at this place are arranged in a circle.
That means the first house is the neighbor of the last one. Meanwhile, adjacent houses have a security system
connected, and it will automatically contact the police if two adjacent houses were broken into on the same night.

Given an integer array nums representing the amount of money of each house,
return the maximum amount of money you can rob tonight without alerting the police.

Note: This is House Robber II (circular version of House Robber I).

Example 1:
Input: nums = [2,3,2]
Output: 3
Explanation: You cannot rob house 1 (money = 2) and then rob house 3 (money = 2),
because they are adjacent houses.

Example 2:
Input: nums = [1,2,3,1]
Output: 4
Explanation: Rob house 1 (money = 1) and then rob house 3 (money = 3).
Total amount you can rob = 1 + 3 = 4.

Example 3:
Input: nums = [1,2,3]
Output: 3

Time Complexity : ?
Space Complexity: ?

*/

  class Solution {
    /**
     * @param {number[]} nums
     * @return {number}
     */

    rob(nums) {
      if (nums.length === 1) return nums[0];

      const helper = (houses) => {
        let rob1 = 0,
          rob2 = 0;
        for (const num of houses) {
          const temp = Math.max(num + rob1, rob2);
          rob1 = rob2;
          rob2 = temp;
        }
        return rob2;
      };

      return Math.max(
        helper(nums.slice(0, -1)), // exclude the last house
        helper(nums.slice(1)), // exclude the first house
      );
      // Time: O(n) — two linear passes over (roughly) the whole array. Space: O(n) due to the two .slice() copies (avoidable with index-bounded loops instead of slicing, for O(1)).
    }
  }

  // Test cases
  const solution = new Solution();

  console.log(solution.rob([2, 3, 2])); // Expected: 3
  console.log("");
  console.log("");

  console.log(solution.rob([1, 2, 3, 1])); // Expected: 4
  console.log("");
  console.log("");

  console.log(solution.rob([1, 2, 3])); // Expected: 3
  console.log("");
  console.log("");

  console.log(solution.rob([1])); // Expected: 1
  console.log("");
  console.log("");

  console.log(solution.rob([2, 1])); // Expected: 2
  console.log("");
  console.log("");

  console.log(solution.rob([1, 2, 3, 4, 5, 1])); // Expected: 9 (1+3+5 or 2+4+1 → max is 9)

  console.log("");
  console.log("");

  console.log(solution.rob([10, 1, 10, 1, 10])); // Expected: 20 (10 + 10)
}
