// findMinimumInRotatedSortedArray.js
export default function run() {
/*

Suppose an array nums sorted in ascending order is rotated at some pivot
unknown to you beforehand (i.e., [0,1,2,4,5,6,7] might become [4,5,6,7,0,1,2]).

Given the rotated sorted array nums, return the minimum element of this array.

You must write an algorithm that runs in O(log n) time.

Time Complexity :
Space Complexity:
*/

class Solution {
  /**
   * @param {number[]} nums
   * @return {number}
   */

  findMin(nums) {

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

}
