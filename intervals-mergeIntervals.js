// mergeIntervals.js
export default function run() {
/*
Given an array of intervals where intervals[i] = [starti, endi], 
merge all overlapping intervals, and return an array of the non-overlapping 
intervals that cover all the intervals in the input.

Example 1:
Input: intervals = [[1,3],[2,6],[8,10],[15,18]]
Output: [[1,6],[8,10],[15,18]]

Example 2:
Input: intervals = [[1,4],[4,5]]
Output: [[1,5]]

Example 3:
Input: intervals = [[1,4],[0,2],[3,5]]
Output: [[0,5]]

Example 4:
Input: intervals = [[1,4],[0,4]]
Output: [[0,4]]

Time Complexity : O(N log N)   [due to sorting]
Space Complexity: O(N)         [for the output array]

*/

class Solution {
  /**
   * @param {number[][]} intervals
   * @return {number[][]}
   */

  merge(intervals) {
    if (intervals.length === 0) return []; // Edge case: empty input
    intervals.sort((a, b) => a[0] - b[0]); // Sort intervals by start time
    const output = [intervals[0]]; // Initialize output with the first interval
    for (const interval of intervals) { // Iterate through sorted intervals
      const start = interval[0]; // Current interval's start time
      const end = interval[1]; // Current interval's end time
      const lastEnd = output[output.length - 1][1]; // End time of the last merged interval
      if (start <= lastEnd) { // If current interval overlaps with the last merged interval
        output[output.length - 1][1] = Math.max(lastEnd, end); /* Merge by updating the end 
                                                    time to the maximum of both intervals */
      } else {
        output.push([start, end]); // else, no overlap, so add the current interval to output
      }
    }
    return output;
  }

}

// Test Cases
const solution = new Solution();

console.log(solution.merge([[1,3],[2,6],[8,10],[15,18]]));
// Expected: [[1,6],[8,10],[15,18]]

console.log("");
console.log(solution.merge([[1,4],[4,5]]));
// Expected: [[1,5]]

console.log("");
console.log(solution.merge([[1,4],[0,2],[3,5]]));
// Expected: [[0,5]]

console.log("");
console.log(solution.merge([[1,4],[0,4]]));
// Expected: [[0,4]]

console.log("");
console.log(solution.merge([[1,3],[2,6],[6,10],[15,18],[8,9]]));
// Expected: [[1,10],[15,18]]

console.log("");
console.log(solution.merge([[1,4]]));                    // [[1,4]]
console.log("");
console.log(solution.merge([]));                         // []
console.log("");
console.log(solution.merge([[1,4],[0,0],[2,3]]));       // [[0,0],[1,4]]
console.log("");
console.log(solution.merge([[1,9],[2,5],[6,8],[9,10]]));// [[1,10]]
}