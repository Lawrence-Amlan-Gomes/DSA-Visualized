// bestTimeToBuyAndSellStock.js
export default function run() {
  /*

You are given an array prices where prices[i] is the price of a given stock on the ith day.

You want to maximize your profit by choosing a single day to buy one share
and choosing a different day in the future to sell that share.

Return the maximum profit you can achieve from this transaction.
If you cannot achieve any profit, return 0.

Time Complexity :
Space Complexity:

*/

  class Solution {
    /**
     * @param {number[]} prices
     * @return {number}
     */
    maxProfit(prices) {
      // let res = 0;
      // for (let i = 0; i < prices.length; i++) {
      //   for (let j = i + 1; j < prices.length; j++) {
      //     res = Math.max(res, prices[j] - prices[i]);
      //   }
      // }
      // return res;
      // Time: O(n²) — every pair is checked. Space: O(1) — just a running max.

      let minPrice = Infinity;
      let maxP = 0;
      for (let i = 0; i < prices.length; i++) {
        if (prices[i] < minPrice) {
          minPrice = prices[i];
        } else {
          maxP = Math.max(maxP, prices[i] - minPrice);
        }
      }
      return maxP;

      // Time: O(n) — one pass over the prices. Space: O(1) — just the running min and max.
    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.maxProfit([7, 1, 5, 3, 6, 4]));
  // Expected: 5

  console.log(solution.maxProfit([7, 6, 4, 3, 1]));
  // Expected: 0

  console.log(solution.maxProfit([1, 2]));
  // Expected: 1

  console.log(solution.maxProfit([2, 4, 1]));
  // Expected: 2

  console.log(solution.maxProfit([3, 2, 6, 5, 0, 3]));
  // Expected: 4

  console.log(solution.maxProfit([1]));
  // Expected: 0

  console.log(solution.maxProfit([]));
  // Expected: 0

  console.log(solution.maxProfit([1, 2, 4, 2, 5, 7, 3]));
  // Expected: 6
}
