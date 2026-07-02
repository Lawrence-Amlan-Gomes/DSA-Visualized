// containerWithMostWater.js
export default function run() {
/*

Given n non-negative integers representing an array height of length n,
where each represents a point at coordinate (i, height[i]).
Find two lines that together with the x-axis form a container,
such that the container contains the most water.

Return the maximum amount of water a container can store.
You may not slant the container.

Time Complexity : O(N)     [each pointer moves at most N steps]
Space Complexity: O(1)     [only two pointers + result variable]

This is the OPTIMAL two-pointer greedy solution (NeetCode / LeetCode standard).

*/

class Solution {
  /**
   * @param {number[]} height
   * @return {number}
   */

  maxArea(height) {
    // Category: Two Pointers (Very High Frequency)
    let l = 0; // left pointer starts at the beginning which is the left line of the container
    let r = height.length - 1; 
    // right pointer starts at the end which is the right line of the container
    let res = 0; // To store the maximum area found so far
    while (l < r) { // left and right pointers will move towards each other
      /* Step 1: Calculate current area using the shorter line, 
         because water cannot be taller than the shorter line */
      const area = Math.min(height[l], height[r]) * (r - l);
      // Step 2: Update global max
      res = Math.max(res, area);
      /* Step 3: Move the pointer with the shorter line inward 
         (greedy choice — moving the taller one cannot give bigger area so 
         we are moving the shorter one to try to find a taller line) */
      if (height[l] <= height[r]) {
        l++;
      } else {
        r--;
      }
    }
    return res;
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
// Expected: 49

console.log(solution.maxArea([0, 0]));
// Expected: 0

console.log(solution.maxArea([]));
// Expected: 0

console.log(solution.maxArea([2]));
// Expected: 0

/* 

Easy explanation: We start with the widest possible container (pointers at both ends). 
The amount of water is always limited by the shorter line, so we calculate area with 
the current shorter height. To get more water, we must find a taller line while width 
decreases — therefore we always move the shorter pointer inward (if left <= right move left, 
else move right). Moving the taller pointer would waste the current width without any 
chance of increasing height. We keep updating the maximum area we have seen. 
This greedy strategy guarantees we check the optimal pair without missing anything.

*/

}