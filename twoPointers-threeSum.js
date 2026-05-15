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

Time Complexity : O(N²)     [O(N log N) for sort + O(N²) for two pointers]
Space Complexity: O(1)      [no extra space besides output list]

This is the OPTIMAL and most popular solution (NeetCode-style two pointers after sorting).

*/


class Solution {
  /**
   * @param {number[]} nums
   * @return {number[][]}
   */

  threeSum(nums) {
    // Category: Two Pointers + Sorting (Very High Frequency)
    nums.sort((a, b) => a - b);           
    // Step 1: Sort to enable two pointers + easy duplicate skip
    // E.g. [3, 0, -2, -1, 1, 2] → [-2, -1, 0, 1, 2, 3]
    const res = []; // To store unique triplets
    for (let i = 0; i < nums.length; i++) { // i will be the first number in the triplet
      // Step 2: If i not 0 and current number is same as previous, skip to avoid duplicate triplets
      if (i > 0 && nums[i] === nums[i - 1]) continue;
      /* Early exit: If the first number is already > 0, we can't find another 2 number to sum to 0 
      because all remaining numbers are positive because the array is sorted */
      if (nums[i] > 0) break;
      let l = i + 1; // left pointer starts right after i which is the 2nd number in the triplet
      let r = nums.length - 1; // right pointer starts at the end which is the 3rd number
      while (l < r) { // left and right pointers will move towards each other
        const sum = nums[i] + nums[l] + nums[r]; // calculate current sum of the triplet
        if (sum < 0) {
          l++;// Need larger sum → move left pointer right beacause array is sorted
        } else if (sum > 0) {
          r--;// Need smaller sum → move right pointer left because array is sorted
        } else {
          // Step 3: Found valid triplet and add to result
          res.push([nums[i], nums[l], nums[r]]);
          /* Step 4: Skip duplicates for both pointers to avoid duplicate triplets
          We are finding another 2nd and 3rd number for the same 1st number (i) */
          l++;
          r--;
          while (l < r && nums[l] === nums[l - 1]) l++;// Skip duplicates for left pointer like Step 2
          while (l < r && nums[r] === nums[r + 1]) r--;//Skip duplicates for right pointer like Step 2
        }
      }
    }
    return res;
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

/* 

We sort the array first so we can use two pointers efficiently and skip duplicates easily.  
Then for each number (fixed as the first one in the triplet), we use two pointers 
(left and right) to find the other two numbers that make the sum zero.  
If the current sum is too small → move left pointer right (to get bigger numbers).  
If too big → move right pointer left (to get smaller numbers). If exactly zero → add the 
triplet, then move both pointers and skip any duplicates to avoid repeated answers.  
We also skip duplicate values for the first number and stop early if the first number is 
already positive (no way to get sum=0).

*/
}