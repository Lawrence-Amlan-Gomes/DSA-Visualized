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

Time Complexity : O(n)
Space Complexity: O(1)

This is the optimized solution for House Robber II.
Because houses are in a circle, we cannot rob both first and last house.
So we compute two cases:
  1. Rob houses from 0 to n-2 (exclude last house)
  2. Rob houses from 1 to n-1 (exclude first house)
Then take the maximum of both cases.
*/

class Solution {
  /**
   * @param {number[]} nums
   * @return {number}
   */

  rob(nums) {
    if (nums.length === 0) return 0;
    if (nums.length === 1) return nums[0];
    if (nums.length === 2) return Math.max(nums[0], nums[1]);
    return Math.max(
      this.helper(nums.slice(0, -1)), // helper function if basically problem 1 (linear case)
      // This line creates a new array excluding the last element (nums[0] to nums[n-2])
      this.helper(nums.slice(1))        
      // This line creates a new array excluding the first element (nums[1] to nums[n-1])
    );
  }

  /**
   * @param {number[]} nums
   * @return {number}
   * Helper function - same as House Robber I (linear case)
   */
  helper(nums) {
    // Category: Dynamic Programming (Space Optimized)
    // rob1 = max money robbing up to house i-2
    // rob2 = max money robbing up to house i-1
    let rob1 = 0;
    let rob2 = 0;

    for (const num of nums) {
      // At current house: either rob it (num + rob1) or skip it (rob2)
      const newRob = Math.max(rob1 + num, rob2);

      // Slide the window forward
      rob1 = rob2;
      rob2 = newRob;
    }

    return rob2;
  }
}

// Test cases
const solution = new Solution();

console.log(solution.rob([2,3,2]));           // 3
console.log("");
console.log("");

console.log(solution.rob([1,2,3,1]));         // 4
console.log("");
console.log("");

console.log(solution.rob([1,2,3]));           // 3
console.log("");
console.log("");

console.log(solution.rob([1]));               // 1
console.log("");
console.log("");

console.log(solution.rob([2,1]));             // 2
console.log("");
console.log("");

console.log(solution.rob([1,2,3,4,5,1]));     // 9  (1+3+5 or 2+4+1 → max is 9)

console.log("");
console.log("");

console.log(solution.rob([10, 1, 10, 1, 10])); // 20 (10 + 10)
}