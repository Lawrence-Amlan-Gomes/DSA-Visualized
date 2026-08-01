// backtracking-subsets.js

export default function run() {
  /*
Given an integer array nums of unique elements, return all possible subsets
(the power set). The solution set must not contain duplicate subsets.
Return the subsets in any order.

Example:
Input: nums = [1,2,3]
Output: [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]  (any order is fine)

Time Complexity :
Space Complexity:

*/

  class Solution {
    /**
     * @param {number[]} nums
     * @return {number[][]}
     */
    subsets(nums) {
      // const n = nums.length;
      // const result = [];
      // for (let mask = 0; mask < 1 << n; mask++) {
      //   const subset = [];
      //   for (let i = 0; i < n; i++) {
      //     if (mask & (1 << i)) subset.push(nums[i]);
      //   }
      //   result.push(subset);
      // }
      // return result;
      // Time: O(n · 2n) — 2n masks, and building each subset costs up to O(n). Space: O(n · 2n) for the output (unavoidable — that's how many numbers appear across all subsets combined).

      const result = [];
      const current = [];
      const backtrack = (i) => {
        if (i === nums.length) {
          result.push([...current]);
          return;
        }
        backtrack(i + 1); // exclude nums[i]
        current.push(nums[i]);
        backtrack(i + 1); // include nums[i]
        current.pop(); // undo before returning
      };
      backtrack(0);
      return result;

      // Time: O(n · 2n) — 2n leaves in the recursion tree, and copying current into the result at each one costs up to O(n). Space: O(n) extra for the recursion stack and the current array (not counting the output itself, which is O(n · 2n) either way).
    }
  }

  const solution = new Solution();
  console.log(JSON.stringify(solution.subsets([1, 2, 3])));
  // [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]] (any order)

  console.log("");

  console.log(JSON.stringify(solution.subsets([0])));
  // [[],[0]]

  // --- Test Cases Batch (Silent on Success) ---
  let failures = 0;
  const normalize = (subsets) =>
    subsets.map((s) => JSON.stringify([...s].sort((a, b) => a - b))).sort();

  const test = (num, nums, expected) => {
    const originalLog = console.log;
    console.log = () => {}; // Silence internal logs
    const actual = new Solution().subsets(nums);
    console.log = originalLog; // Restore logging

    const mismatch =
      JSON.stringify(normalize(actual)) !== JSON.stringify(normalize(expected));
    if (mismatch) {
      failures++;
      console.log(
        `${num}: ❌ Failed (Expected ${JSON.stringify(expected)}, Got ${JSON.stringify(actual)})`,
      );
    }
  };

  console.log(" ");

  // 1: classic example, 3 elements -> 8 subsets
  test(1, [1, 2, 3], [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]);

  // 2: single element
  test(2, [0], [[], [0]]);

  // 3: empty input -> only the empty subset
  test(3, [], [[]]);

  // 4: negative numbers mixed in
  test(4, [5, -3], [[], [5], [-3], [5, -3]]);

  // 5: 4 elements -> 16 subsets
  test(
    5,
    [1, 2, 3, 4],
    [
      [],
      [1],
      [2],
      [1, 2],
      [3],
      [1, 3],
      [2, 3],
      [1, 2, 3],
      [4],
      [1, 4],
      [2, 4],
      [1, 2, 4],
      [3, 4],
      [1, 3, 4],
      [2, 3, 4],
      [1, 2, 3, 4],
    ],
  );

  if (failures === 0) console.log("✅ All success");
}
