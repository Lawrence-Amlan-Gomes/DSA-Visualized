// containerWithMostWater.js
export default function run() {
  /*

Given n non-negative integers representing an array height of length n,
where each represents a point at coordinate (i, height[i]).
Find two lines that together with the x-axis form a container,
such that the container contains the most water.

Return the maximum amount of water a container can store.
You may not slant the container.

Time Complexity :
Space Complexity:

*/

  class Solution {
    /**
     * @param {number[]} height
     * @return {number}
     */
    maxArea(height) {
      // let res = 0;
      // for (let i = 0; i < height.length; i++) {
      //   for (let j = i + 1; j < height.length; j++) {
      //     const area = Math.min(height[i], height[j]) * (j - i);
      //     res = Math.max(res, area);
      //   }
      // }
      // return res;
      // Time: O(n²) — every pair is checked. Space: O(1) — just a running max.

      let l = 0,
        r = height.length - 1;
      let res = 0;
      while (l < r) {
        const area = Math.min(height[l], height[r]) * (r - l);
        res = Math.max(res, area);
        if (height[l] <= height[r]) l++;
        else r--;
      }
      return res;
      // Time: O(n) — each pointer moves inward at most n times total, so the whole scan is one pass. Space: O(1) — only two pointers and a running max.
    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]));
  // Expected: 49

  console.log(solution.maxArea([1, 1]));
  // Expected: 1

  console.log(solution.maxArea([1, 2, 1]));
  // Expected: 2

  console.log(solution.maxArea([4, 3, 2, 1, 4]));
  // Expected: 16

  console.log(solution.maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7, 9, 5]));
  // Expected: 64

  console.log(solution.maxArea([0, 0]));
  // Expected: 0

  console.log(solution.maxArea([]));
  // Expected: 0

  console.log(solution.maxArea([2]));
  // Expected: 0
}
