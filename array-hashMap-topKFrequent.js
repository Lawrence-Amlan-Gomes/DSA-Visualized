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

Time Complexity : O(N) 
Space Complexity:
  • O(N) for the frequency map + buckets (total size ≤ N)
  • O(k) for the output list

This is the OPTIMAL & MOST COMPACT solution (linear time using HashMap + bucket sort).
Handles negative numbers perfectly. No unnecessary length checks or Object.entries.
 
*/
 
class Solution {
  /**
   * @param {number[]} nums
   * @param {number} k
   * @return {number[]}
   */
 
  topKFrequent(nums, k) {
    /* Category: Arrays + HashMap (frequency count + bucket sort)
       Step 1: Build frequency count map (plain object, works for negatives too)
       Keys = numbers, Values = frequency
       Example: [4,1,4,2,4,3,4,1,1,1,2,2,3,3,3,5] → {1:4, 2:3, 3:4, 4:5, 5:1} */
    const count = {};
    for (const n of nums) {
      count[n] = count[n] ? count[n] + 1 : 1;
    }
    /* Step 2: Create frequency buckets array where index = frequency
       the bucket array has length N+1 because max frequency of any number is N (if all are the same)  */
    const freq = Array.from({ length: nums.length + 1 }, () => []);
    /* Step 3: Fill buckets (for..in gives keys in insertion order)
       Example: frep = [ [], [5], [], [2], [1,3], [4] ] 
       means 5 appears once, 2 appears twice, 1 and 3 appear three times, 4 appears five times */
    for (const n in count) {
      freq[count[n]].push(parseInt(n));   
      // parseInt handles negative keys correctly, 
      // example: If count = { "-1": 2 } → freq[2] = ["-1"] → parseInt("-1") = -1
    }
    /* Step 4: Collect from highest frequency down (start at N, stop at 1) in reverse order.
       No length check needed — empty arrays are simply skipped by for..of */ 
    const res = [];
    for (let i = freq.length - 1; i > 0; i--) {
      for (const n of freq[i]) {
        res.push(n);
        if (res.length === k) { // Means we have collected k most frequent elements, 
        // we can return the result immediately
          return res;
        }
      }
    }
    // Problem guarantees we will always return inside the loop
  }
 
}
 
// Test
const solution = new Solution();
 
console.log(solution.topKFrequent([1,1,1,2,2,3], 2));
console.log("")
console.log("")
// Expected: [1,2] (any order ok)
 
console.log(solution.topKFrequent([1], 1));                    // [1]
console.log("")
console.log("")
console.log(solution.topKFrequent([1,2,3,4], 2));              // [1,2] (insertion order when freqs equal)
 console.log("")
console.log("")
console.log(solution.topKFrequent([1,1,1,2,2,3,3,3], 2));      // [1,3]
 console.log("")
console.log("")
console.log(solution.topKFrequent([1,-1,1,-1,2], 2));          // [1,-1]
 console.log("")
console.log("")

console.log(solution.topKFrequent([4,1,4,2,4,3,4,1,1,1,2,2,3,3,3], 3));
// Expected: [4,1,3] or similar (any order ok)

console.log("")
console.log("")
console.log(solution.topKFrequent([1,2,2,2,3,3,3,3,4,4,4,4,4], 3));
// Expected: [4,3,2]
 
 
/*

First, count how many times each number shows up in the array using a simple object 
(like a frequency map). Then create an array of buckets where the index = 
frequency (so bucket[5] holds all numbers that appeared exactly 5 times).  
Finally, start from the highest frequency bucket and go downwards, collecting numbers 
until you have exactly k of them. This clever "bucket sort" trick lets us find the top k 
most frequent numbers very quickly in linear time — no sorting required!

*/
 
}