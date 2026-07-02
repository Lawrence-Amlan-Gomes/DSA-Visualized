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

Time Complexity : O(n)
Space Complexity: O(1)


*/

class Solution {
  /**
   * @param {number[]} nums
   * @return {number}
   */

  rob(nums) {
    // Category: Dynamic Programming (House Robber - Classic 1D DP)
    if (nums.length === 0) return 0; // edge case: no houses → no money to rob
    if (nums.length === 1) return nums[0]; // edge case: only one house → rob it
    let rob1 = 0;   // option 1: Max money if we robbed up to house i-2
    let rob2 = 0;   // option 2: Max money if we robbed up to house i-1
    for (const num of nums) { // Iterate through each house's money
      const temp = Math.max(num + rob1, rob2); /* rob this house (num + rob1) vs skip this house (rob2) */
      rob1 = rob2;   // Previous best becomes rob1 for next iteration
      rob2 = temp;   // Current best becomes rob2 for next iteration
    }
    return rob2; // rob2 holds the maximum money we can rob after processing all houses
  }
}

// Test cases
const solution = new Solution();

console.log(solution.rob([1,2,3,1]));           // 4
console.log("");
console.log("");

console.log(solution.rob([2,7,9,5,2]));         // 13

console.log("");
console.log("");

console.log(solution.rob([1,2,3]));             // 4
console.log("");
console.log("");

console.log(solution.rob([2,1,1,2]));           // 4  (2 + 2)
console.log("");
console.log("");

console.log(solution.rob([1]));                 // 1
console.log("");
console.log("");

console.log(solution.rob([1, 100, 1]));         // 101
console.log("");
console.log("");

console.log(solution.rob([10, 1, 10, 1, 10]));  // 30
}