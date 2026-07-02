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

Time Complexity : O(1)   [using closed-form Binet's formula]
Space Complexity: O(1)


*/

class Solution {
  /**
   * @param {number} n
   * @return {number}
   */

  climbStairs(n) {
    if (n === 1) return 1; // base case: 1 way to climb 1 step
    if (n === 2) return 2; // base case: 2 ways to climb 2 steps (1+1 or 2)
    let prev2 = 1;  // ways(1) because to climb 1 step, there's only 1 way (1)
    let prev1 = 2;  // ways(2) because to climb 2 steps, there are 2 ways (1+1 or 2)
    for (let i = 3; i <= n; i++) { /* for n > 2, the number of ways to climb n steps is the sum of ways to 
                                      climb (n-1) and (n-2) steps*/
      let current = prev1 + prev2; // ways(n) = ways(n-1) + ways(n-2)
      prev2 = prev1; // update prev2 to the previous prev1 (which is ways(n-1))
      prev1 = current; // update prev1 to the current (which is ways(n)) for the next iteration
    }
    return prev1;
  }

}

// Test cases
const solution = new Solution();

console.log(solution.climbStairs(2));   // 2
console.log("");
console.log("");

console.log(solution.climbStairs(3));   // 3
console.log("");
console.log("");

console.log(solution.climbStairs(1));   // 1
console.log("");
console.log("");

console.log(solution.climbStairs(4));   // 5

console.log("");
console.log("");

console.log(solution.climbStairs(5));   // 8
console.log("");
console.log("");

console.log(solution.climbStairs(10));  // 89
console.log("");
console.log("");

console.log(solution.climbStairs(45));  // Should work fine (within JS number precision for this problem)
}