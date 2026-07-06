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

*/

  class Solution {
    /**
     * @param {number[]} nums
     * @return {number[]}
     */

    productExceptSelf(nums) {
      // const res = [];
      // for (let i = 0; i < nums.length; i++) {
      //   let product = 1;
      //   for (let j = 0; j < nums.length; j++) {
      //     if (j !== i) product *= nums[j];
      //   }
      //   res.push(product);
      // }
      // return res;
      // Time: O(n²) — an inner loop over the whole array for every index. Space: O(n) — the output array.

      const n = nums.length;
      const res = new Array(n).fill(1);

      for (let i = 1; i < n; i++) {
        res[i] = res[i - 1] * nums[i - 1];
      }

      let suffix = 1;
      for (let i = n - 1; i >= 0; i--) {
        res[i] *= suffix;
        suffix *= nums[i];
      }
      return res;

      // Time: O(n) — two linear passes. Space: O(1) extra — only the output array, which the problem allows since you have to return it anyway.
    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.productExceptSelf([1, 2, 3, 4]));
  // Expected: [24,12,8,6]

  console.log(solution.productExceptSelf([-1, 1, 0, -3, 3]));
  // Expected: [0,0,9,0,0]

  console.log(solution.productExceptSelf([1])); // [1]

  console.log(solution.productExceptSelf([0, 0])); // [0,0]

  console.log(solution.productExceptSelf([2, 3, 4, 5]));
  // Expected: [60,40,30,24]

  console.log(solution.productExceptSelf([1, -2, 3, -4]));
  // Expected: [24,-12,8,-6]

  console.log(solution.productExceptSelf([1, 2, 3, 4, 5]));
  // Expected: [120,60,40,30,24]
}
