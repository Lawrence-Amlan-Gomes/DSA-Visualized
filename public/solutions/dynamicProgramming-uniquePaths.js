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
    // uniquePaths(m, n) {
    //   function go(r, c) {
    //     if (r === m - 1 || c === n - 1) return 1;
    //     return go(r + 1, c) + go(r, c + 1);
    //   }
    //   return go(0, 0);
    // }
    // Time: O(2m+n) — two branches at every step, up to (m+n) steps deep, and the same cells get re-explored from different paths. Space: O(m+n) — the recursion stack.
    uniquePaths(m, n) {
      const dp = Array.from({ length: m }, () => new Array(n).fill(1));
      for (let r = m - 2; r >= 0; r--) {
        for (let c = n - 2; c >= 0; c--) {
          dp[r][c] = dp[r + 1][c] + dp[r][c + 1];
        }
      }
      return dp[0][0];
    }
    // Time: O(m·n) — every cell filled once. Space: O(m·n) for the full table — reducible to O(n) by only keeping the current and previous row, since each cell only ever needs the row below it.
  }

  const solution = new Solution();
  console.log(solution.uniquePaths(3, 7)); // Expected: 28
  console.log(solution.uniquePaths(3, 2)); // Expected: 3
  console.log(solution.uniquePaths(1, 1)); // Expected: 1
  console.log(solution.uniquePaths(7, 3)); // Expected: 28
  console.log(solution.uniquePaths(1, 10)); // Expected: 1
  console.log(solution.uniquePaths(10, 1)); // Expected: 1
  console.log(solution.uniquePaths(23, 12)); // Expected: 193536720
}
