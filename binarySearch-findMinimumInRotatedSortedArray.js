// findMinimumInRotatedSortedArray.js
export default function run() {
/*

Suppose an array nums sorted in ascending order is rotated at some pivot
unknown to you beforehand (i.e., [0,1,2,4,5,6,7] might become [4,5,6,7,0,1,2]).

Given the rotated sorted array nums, return the minimum element of this array.

You must write an algorithm that runs in O(log n) time.

Time Complexity : O(log N)   [binary search — each step halves the search space]
Space Complexity: O(1)       [only three integer pointers]

This is the OPTIMAL binary search solution (NeetCode / LeetCode standard).
*/

class Solution {
  /**
   * @param {number[]} nums
   * @return {number}
   */

  findMin(nums) {
    // Category: Binary Search on Rotated Sorted Array
    let l = 0, // left pointer starts at the beginning of the array
        r = nums.length - 1; // right pointer starts at the end of the array
    while (l < r) { // while there are at least 2 elements in the current search space
      let m = l + Math.floor((r - l) / 2); // middle index to check
      if (nums[m] < nums[r]) { /* If middle element is less than the rightmost element, it means the 
        right half (m to r) is sorted, so the minimum must be in the left half (l to m) including m */
        r = m; // So we can safely discard the right half by moving the right pointer to m
      } else { /* If middle element is greater than or equal to the rightmost element, it means the 
        minimum is in the right half (m+1 to r) */
        l = m + 1; // So we can safely discard the left half by moving the left pointer to m + 1
      }
    }
    return nums[l]; // When loop ends, l === r → this index holds the smallest element
  }

}

// Test
const solution = new Solution();

console.log(solution.findMin([3, 4, 5, 1, 2]));
// Expected: 1

console.log(solution.findMin([4, 5, 6, 7, 0, 1, 2]));
// Expected: 0

console.log(solution.findMin([11, 13, 15, 17]));
// Expected: 11

console.log(solution.findMin([2, 1]));
// Expected: 1

console.log(solution.findMin([1]));
// Expected: 1

console.log(solution.findMin([1, 2]));
// Expected: 1

console.log(solution.findMin([5, 1, 2, 3, 4]));
// Expected: 1

console.log(solution.findMin([3, 1, 2]));
// Expected: 1

console.log(solution.findMin([2, 3, 1]));
// Expected: 1

console.log(solution.findMin([1, 2, 3, 4, 5]));
// Expected: 1

/*

If nums[m] < nums[r], it means the the m could be the mininum 
or the minimum is in it's left.
So we can safely discard the right half by setting r = m.

If nums[m] >= nums[r], it means the minimum is in the right half, 
so we can safely discard the left half by setting l = m + 1.

*/
}