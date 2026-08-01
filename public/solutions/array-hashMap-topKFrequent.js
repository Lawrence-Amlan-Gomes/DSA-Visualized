// topKFrequent.js
export default function run() {
  /*

  Given an array of integers nums and an integer k, return the k most frequent elements.
  You may return the answer in any order.

  Example 1:
   Input: nums = [1,1,1,2,2,3], k = 2
   Output: [1,2]

  Example 2:
   Input: nums = [1], k = 1
   Output: [1]

  Example 3:
   Input: nums = [1,2,3,4], k = 2
   Output: [1,2]

  Follow the discipline (Roadmap view → Phase 1 → Top K Frequent Elements):
  1. Brute force first — comment its time and space complexity above it.
  2. Optimize — say what the brute force wastes.
  3. Re-derive complexity for the optimized version.
  4. Edge cases — k equals unique count, all identical, negative numbers, ties.
  5. Run it here in LiveCoding, check DevTools.

  */

  class Solution {
    /**
     * @param {number[]} nums
     * @param {number} k
     * @return {number[]}
     */
    topKFrequent(nums, k) {
      // const count = {};
      // for (const n of nums) count[n] = (count[n] || 0) + 1;
      // const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
      // return sorted.slice(0, k).map(([n]) => Number(n));
      // Time: O(n log n) — counting is O(n), but sorting the unique values dominates. Space: O(n) — the count map.

      const count = {};
      for (const n of nums) count[n] = (count[n] || 0) + 1;

      const buckets = Array.from({ length: nums.length + 1 }, () => []);
      for (const n in count) buckets[count[n]].push(Number(n));

      const res = [];
      for (let f = buckets.length - 1; f > 0 && res.length < k; f--) {
        for (const n of buckets[f]) {
          res.push(n);
          if (res.length === k) break;
        }
      }
      return res;
      // Time: O(n) — counting is O(n), building buckets is O(n), walking buckets visits at most n items total. Space: O(n) — the count map and the buckets array together.
    }
  }

  // Test
  const solution = new Solution();

  console.log(solution.topKFrequent([1, 1, 1, 2, 2, 3], 2));
  // Expected: [1,2] (any order ok)

  console.log(solution.topKFrequent([1], 1));
  // Expected: [1]

  console.log(solution.topKFrequent([1, 2, 3, 4], 2));
  // Expected: [1,2] (any order ok, all tied at frequency 1)

  console.log(solution.topKFrequent([1, 1, 1, 2, 2, 3, 3, 3], 2));
  // Expected: [1,3]

  console.log(solution.topKFrequent([1, -1, 1, -1, 2], 2));
  // Expected: [1,-1]

  console.log(
    solution.topKFrequent([4, 1, 4, 2, 4, 3, 4, 1, 1, 1, 2, 2, 3, 3, 3], 3),
  );
  // Expected: [4,1,3] (any order ok)

  console.log(
    solution.topKFrequent([1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4], 3),
  );
  // Expected: [4,3,2]
}
