// climbingStairs.js
export default function run() {
  /*
You are climbing a staircase. It takes n steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?

Example 1:
Input: n = 2
Output: 2
Explanation: There are two ways to climb to the top.
1. 1 step + 1 step
2. 2 steps

Example 2:
Input: n = 3
Output: 3
Explanation: There are three ways to climb to the top.
1. 1 step + 1 step + 1 step
2. 1 step + 2 steps
3. 2 steps + 1 step

Example 3:
Input: n = 1
Output: 1

Time Complexity : ?
Space Complexity: ?

*/

  class Solution {
    /**
     * @param {number} n
     * @return {number}
     */

    climbStairs(n) {
      // if (n === 1) return 1;
      // if (n === 2) return 2;
      // return climbStairs(n - 1) + climbStairs(n - 2);
      // Time: O(2²) — branching factor 2, depth n (Phase 0, Section 2), since every call re-solves the same smaller sub-problems from scratch. Space: O(n) — the recursion stack's depth.

      if (n === 1) return 1;
      if (n === 2) return 2;
      let prev2 = 1,
        prev1 = 2;
      for (let i = 3; i <= n; i++) {
        const current = prev1 + prev2;
        prev2 = prev1;
        prev1 = current;
      }
      return prev1;
      // Time: O(n) — one pass from 3 to n. Space: O(1) — just two rolling variables, no array. (A top-down memoized version is also valid, at O(n) time but O(n) space for the memo table plus recursion stack — this bottom-up version is strictly better on space.)
    }
  }

  // Test cases
  const solution = new Solution();

  console.log(solution.climbStairs(2)); // Expected: 2
  console.log("");
  console.log("");

  console.log(solution.climbStairs(3)); // Expected: 3
  console.log("");
  console.log("");

  console.log(solution.climbStairs(1)); // Expected: 1
  console.log("");
  console.log("");

  console.log(solution.climbStairs(4)); // Expected: 5

  console.log("");
  console.log("");

  console.log(solution.climbStairs(5)); // Expected: 8
  console.log("");
  console.log("");

  console.log(solution.climbStairs(10)); // Expected: 89
  console.log("");
  console.log("");

  console.log(solution.climbStairs(45)); // Expected: 1836311903
}
