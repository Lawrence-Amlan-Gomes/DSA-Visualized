// searchInRotatedSortedArray.js

export default function run() {
/*
Search in Rotated Sorted Array

Given an integer array nums sorted in ascending order (with distinct values)
that has been rotated at some unknown pivot index k (1 <= k < nums.length),
return the index of target if it exists in nums, or -1 if it does not.

You must write an algorithm with O(log n) runtime complexity.

Time Complexity : O(log N)   [binary search — each step halves the search space]
Space Complexity: O(1)       [only three integer pointers]

This is the OPTIMAL binary search solution (NeetCode / LeetCode standard).
*/

class Solution {
  /**
   * @param {number[]} nums
   * @param {number} target
   * @return {number}
   */

  search(nums, target) {
    // Category: Binary Search on Rotated Sorted Array
    let l = 0, // left pointer of search space
        r = nums.length - 1; // right pointer of search space
    while (l <= r) { // while search space is not empty
      const mid = Math.floor((l + r) / 2); // middle index of search space
      if (target === nums[mid]) { // target found at mid index, so return mid
        return mid; /* One point in the loop the left will be equal to the right after doing the 
        below steps, and the mid will be equal to both left and right, so we need to check 
        if the target is at mid index before doing the below steps */
      }
      if (nums[l] <= nums[mid]) { // If left half (l to mid) is sorted
        if (target > nums[mid] || target < nums[l]) { /* If target is greater than mid value OR 
          target is less than left value, it means the target is not in the sorted left half */
          l = mid + 1; //so we can skip the left half and safely move the left pointer to mid + 1
        } else { /* Else, the target is in the sorted left half */  
          r = mid - 1; // so we can safely move the right pointer to mid - 1 to skip the right half
        }
      } else { /* Else, the right half (mid to r) is sorted */
        if (target < nums[mid] || target > nums[r]) { /* If target is less than mid value OR
          target is greater than right value, it means the target is not in the sorted right half */
          r = mid - 1; // so we can skip the right half and safely move the right pointer to mid - 1
        } else { /* Else, the target is in the sorted right half */
          l = mid + 1; // so we can safely move the left pointer to mid + 1 to skip the left half
        }
      }
    }
    return -1; // Target not found after the above steps, so return -1
  }

}

// Test
const solution = new Solution();

console.log(solution.search([4, 5, 6, 7, 0, 1, 2], 0));
// Expected: 4

console.log(solution.search([4, 5, 6, 7, 0, 1, 2], 3));
// Expected: -1

console.log(solution.search([1], 1));
// Expected: 0

console.log(solution.search([1, 2], 1));
// Expected: 0

console.log(solution.search([5, 1, 2, 3, 4], 3));
// Expected: 3

console.log(solution.search([3, 4, 5, 1, 2], 1));
// Expected: 3

console.log(solution.search([11, 13, 15, 17], 13));
// Expected: 1

console.log(solution.search([1, 2, 3, 4, 5], 3));
// Expected: 2

console.log(solution.search([4, 5, 6, 7, 0, 1, 2], 7));
// Expected: 3

console.log(solution.search([4, 5, 6, 7, 0, 1, 2], 6));
// Expected: 2

console.log(solution.search([2, 1], 1));
// Expected: 1

console.log(solution.search([3, 1], 3));
// Expected: 0

console.log(solution.search([1, 2, 3], 4));
// Expected: -1

/*

If nums[l] <= nums[mid]
    target > nums[mid] || target < nums[l] 
    it means the target is not in the sorted left half, so we can do l = mid + 1.
    else ( target >= nums[l] && target < nums[mid] ) 
    the target is in the sorted left half, so we can do r = mid - 1.

Else (nums[l] > nums[mid])
    target < nums[mid] || target > nums[r]
    it means the target is not in the sorted right half, so we can do r = mid - 1.
    else ( target >= nums[r] && target < nums[mid] )
    the target is in the sorted right half, so we can do l = mid + 1.

*/
}