// insertInterval.js
export default function run() {
/*
You are given an array of non-overlapping intervals intervals 
where intervals[i] = [starti, endi] represent the start and the end 
of the ith interval and are sorted in ascending order by starti. 
You are also given an interval newInterval = [start, end] 
that represents the start and end of another interval.

Insert newInterval into intervals such that intervals is still 
sorted in ascending order by starti and intervals still has no 
overlapping intervals (merge overlapping intervals if necessary).

Return intervals after the insertion.

Example 1:
Input: intervals = [[1,3],[6,9]], newInterval = [2,5]
Output: [[1,5],[6,9]]

Example 2:
Input: intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]
Output: [[1,2],[3,10],[12,16]]

Example 3:
Input: intervals = [], newInterval = [5,7]
Output: [[5,7]]

Example 4:
Input: intervals = [[1,5]], newInterval = [2,3]
Output: [[1,5]]

Time Complexity : O(N)
Space Complexity: O(N)   [for the result array]

*/

class Solution {
  /**
   * @param {number[][]} intervals
   * @param {number[]} newInterval
   * @return {number[][]}
   */

  insert(intervals, newInterval) { // O(N) time, O(N) space
    const n = intervals.length; // number of existing intervals
    let i = 0; // pointer to iterate through intervals
    const res = []; // result array to store merged intervals
    while (i < n && intervals[i][1] < newInterval[0]) { /* newIntervals 1st element is greater than 
      current interval's 2nd element, means no overlap, So push current interval to result */
      res.push(intervals[i]); 
      i++;
    }
    while (i < n && newInterval[1] >= intervals[i][0]) { /* newInterval's 2nd element is greater than 
      or equal to current interval's 1st element, means there is an overlap, 
      So merge the intervals by updating newInterval's start and end */
      newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
      newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
      i++;
    }
    res.push(newInterval);
    while (i < n) { 
      res.push(intervals[i]); 
      i++;
    }
    return res;
  }

}

// Test Cases
const solution = new Solution();

console.log(solution.insert([[1,3],[6,9]], [2,5]));
// Expected: [[1,5],[6,9]]

console.log("");

console.log(solution.insert([[1,2],[3,5],[6,7],[8,10],[12,16]], [4,8]));
// Expected: [[1,2],[3,10],[12,16]]

console.log("");
console.log(solution.insert([], [5,7]));
// Expected: [[5,7]]

console.log("");
console.log(solution.insert([[1,5]], [2,3]));
// Expected: [[1,5]]

console.log("");
console.log(solution.insert([[1,3],[6,9]], [10,12]));
// Expected: [[1,3],[6,9],[10,12]]

console.log("");
console.log(solution.insert([[1,5]], [6,8]));
// Expected: [[1,5],[6,8]]

console.log("");
console.log(solution.insert([[1,3],[4,6],[8,10]], [5,7]));
// Expected: [[1,3],[4,7],[8,10]]

console.log("");
console.log(solution.insert([[1,2],[3,5]], [2,4]));
// Expected: [[1,5]]
}