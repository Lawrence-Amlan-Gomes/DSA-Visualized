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

Time Complexity : ?
Space Complexity: ?

*/

  class Solution {
    /**
     * @param {number[][]} intervals
     * @return {number[][]}
     */

    merge(intervals) {
      if (intervals.length === 0) return [];
      intervals.sort((a, b) => a[0] - b[0]);

      const output = [intervals[0]];
      for (const [start, end] of intervals) {
        const last = output[output.length - 1];
        if (start <= last[1]) {
          last[1] = Math.max(last[1], end);
        } else {
          output.push([start, end]);
        }
      }
      return output;
      // Time: O(n log n) — dominated by the sort; the merge pass itself is O(n). Space: O(n) for the output array.
    }
  }

  // Test Cases
  const solution = new Solution();

  console.log(
    solution.merge([
      [1, 3],
      [2, 6],
      [8, 10],
      [15, 18],
    ]),
  );
  // Expected: [[1,6],[8,10],[15,18]]

  console.log("");
  console.log(
    solution.merge([
      [1, 4],
      [4, 5],
    ]),
  );
  // Expected: [[1,5]]

  console.log("");
  console.log(
    solution.merge([
      [1, 4],
      [0, 2],
      [3, 5],
    ]),
  );
  // Expected: [[0,5]]

  console.log("");
  console.log(
    solution.merge([
      [1, 4],
      [0, 4],
    ]),
  );
  // Expected: [[0,4]]

  console.log("");
  console.log(
    solution.merge([
      [1, 3],
      [2, 6],
      [6, 10],
      [15, 18],
      [8, 9],
    ]),
  );
  // Expected: [[1,10],[15,18]]

  console.log("");
  console.log(solution.merge([[1, 4]])); // Expected: [[1,4]]
  console.log("");
  console.log(solution.merge([])); // Expected: []
  console.log("");
  console.log(
    solution.merge([
      [1, 4],
      [0, 0],
      [2, 3],
    ]),
  ); // Expected: [[0,0],[1,4]]
  console.log("");
  console.log(
    solution.merge([
      [1, 9],
      [2, 5],
      [6, 8],
      [9, 10],
    ]),
  ); // Expected: [[1,10]]
}
