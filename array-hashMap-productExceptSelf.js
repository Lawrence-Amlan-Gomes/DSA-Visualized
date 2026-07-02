// productExceptSelf.js
export default function run() {
/*
 
Given an integer array nums, return an array answer such that answer[i] is equal to the product of 
all the elements of nums except nums[i].
 
You must write an algorithm that runs in O(n) time and does not use the division operation.

Example 1:
Input: nums = [1,2,3,4]
Output: [24,12,8,6]

Example 2:
Input: nums = [-1,1,0,-3,3]
Output: [0,0,9,0,0]
 
Time Complexity : O(N) 
Space Complexity: O(1) extra space (only the output array)

This is the OPTIMAL & MOST COMPACT solution (two-pass prefix + suffix product in-place).
Handles zeros, negatives, and edge cases (n=1) perfectly — no division needed.
 
*/
 
class Solution {
  /**
   * @param {number[]} nums
   * @return {number[]}
   */
  
  productExceptSelf(nums) {
    // Category: Arrays (prefix + suffix product in one array)
    // This is kidda memorizing algorithm
    const n = nums.length; // store length for easy access
    const res = new Array(nums.length).fill(1); 
    // We use the output array itself to store results:
    // Step 1: Left pass — build prefix product 
    // Example for [1,2,3,4] → res becomes [1, 1, 1×2, 1×2×3] = [1,1,2,6]
    for (let i = 1; i < n; i++) {
      res[i] = res[i - 1] * nums[i - 1];
    }
    // Step 2: Right pass — multiply with running postfix product 
    // Example: res becomes [1×(2×3×4), 1×(3×4), 2×4, 6×1] = [24,12,8,6]
    let postfix = 1;
    for (let i = n - 1; i >= 0; i--) {
      res[i] *= postfix;
      postfix *= nums[i];
    }
    return res; // Final result is in res
  }
 
}
 
// Test
const solution = new Solution();
 
console.log(solution.productExceptSelf([1,2,3,4]));
// Expected: [24,12,8,6]
 
console.log(solution.productExceptSelf([-1,1,0,-3,3]));
// Expected: [0,0,9,0,0]
 
console.log(solution.productExceptSelf([1]));                       // [1]
 
console.log(solution.productExceptSelf([0,0]));                     // [0,0]
 
console.log(solution.productExceptSelf([2,3,4,5]));
// Expected: [60,40,30,24]
 
console.log(solution.productExceptSelf([1,-2,3,-4]));
// Expected: [24,-12,8,-6]
 
console.log(solution.productExceptSelf([1,2,3,4,5]));
// Expected: [120,60,40,30,24]
 
 
/*

We need the product of all numbers except the one at each position — 
without using division and in one pass through the array (well, two smart passes).
We use the output array itself to store results:  
1. First pass (left to right): put the product of everything to the left of each position.  
   Example for [1,2,3,4] → res becomes [1, 1, 1×2, 1×2×3] = [1,1,2,6]  
2. Second pass (right to left): keep a running product of everything to the right, 
   and multiply it into the current res value. Starting from right: postfix=1 → 
   multiply into res[3], then postfix×=4, multiply into res[2], etc.  
   Final result: [1×(2×3×4), 1×(3×4), 2×4, 6×1] = [24,12,8,6]

*/
 
}