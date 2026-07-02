// bestTimeToBuyAndSellStock.js
export default function run() {
/*

You are given an array prices where prices[i] is the price of a given stock on the ith day.

You want to maximize your profit by choosing a single day to buy one share 
and choosing a different day in the future to sell that share.

Return the maximum profit you can achieve from this transaction. 
If you cannot achieve any profit, return 0.

Time Complexity : O(N)     [single pass through the array]
Space Complexity: O(1)     [only two pointers + result variable]

This is the OPTIMAL two-pointer sliding window solution (NeetCode standard).

*/

class Solution {
  /**
   * @param {number[]} prices
   * @return {number}
   */

  maxProfit(prices) {
    // Category: Sliding Window (Two Pointers)
    if (prices.length < 2) return 0; // because we need at least 2 days to make a transaction
    let l = 0;           // left = best day to buy so far (lowest price)
    let r = 1;           // right = current day we are considering to sell
    let maxP = 0;        // max profit found so far
    while (r < prices.length) { // while we have days to check
      if (prices[l] < prices[r]) { // we can make profit by selling today
        let profit = prices[r] - prices[l];
        maxP = Math.max(maxP, profit);
      } else {
        // Found a cheaper price → better to buy here instead
        l = r;
      }
      r++;               // always move forward to check next day
    }
    return maxP; // return the best profit found
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

/*

Easy explanation: left pointer always points to the cheapest buying day found so far. 
right pointer scans every future day. If today's price (right) is higher than our buy price, 
we calculate profit and keep updating the maximum profit seen. If we find a cheaper price 
on the right, we simply move the left pointer to that day (new best buying opportunity). 
Right pointer moves forward every single step. This way we check every possible sell day 
against the lowest buy price before it, all in one pass — no pair is missed, no extra space used.

*/
}