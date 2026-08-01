export default function run() {
  /*
    Unique Paths

    A robot sits at the top-left corner of an m x n grid.
    It can only move right or down. How many different paths
    are there to reach the bottom-right corner?

    Example:
      m = 3, n = 7 -> 28

    Time:  ?
    Space: ?
  */

  class Solution {
    uniquePaths(m, n) {

    }
  }

  const solution = new Solution();
  console.log(solution.uniquePaths(3, 7));   // Expected: 28
  console.log(solution.uniquePaths(3, 2));   // Expected: 3
  console.log(solution.uniquePaths(1, 1));   // Expected: 1
  console.log(solution.uniquePaths(7, 3));   // Expected: 28
  console.log(solution.uniquePaths(1, 10));  // Expected: 1
  console.log(solution.uniquePaths(10, 1));  // Expected: 1
  console.log(solution.uniquePaths(23, 12)); // Expected: 193536720
}
