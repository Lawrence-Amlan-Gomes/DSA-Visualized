// longestConsecutiveSequence.js

export default function run() {
/*
 
Given an unsorted array of integers nums, return the length of the longest 
consecutive elements sequence. You must write an algorithm that runs in O(n) time.

Example 1:
Input: nums = [100,4,200,1,3,2]
Output: 4
 
Time Complexity : O(N) 
Space Complexity: O(N) (for the Map)
 
*/
 
class Solution {
  /**
   * @param {number[]} nums
   * @return {number}
   */
  
  longestConsecutive(nums) {
    // Category: Arrays + HashMap (endpoint length tracking — union of ranges)
    const mp = new Map(); // Map to store {number → length of sequence it belongs to}
    let res = 0; // To track the longest sequence length found
    for (let num of nums) { // loop through each number in the input array
      if (!mp.has(num)) { // Only process if this number hasn't been seen before
        /* Step 1: Get the sequence length from its left and right endpoints */
        const left = mp.get(num - 1) || 0;
        const right = mp.get(num + 1) || 0;
        /* Step 2: Now calculate the new sequence length = left + right + current number (1) */
        const length = left + right + 1;
        mp.set(num, length); /* Store the length for the current number So that in future 
                                it's right or left number can know the length of the sequence from it. */
        // Step 3: Update It's at most left about the length of the sequence
        if (left > 0) {
          mp.set(num - left, length);
        }
        // Step 4: Update It's at most right about the length of the sequence
        if (right > 0) {
          mp.set(num + right, length);
        }
        // Step 5: Track global maximum length found so far
        res = Math.max(res, length);
      }
    }
    return res;
    /* a number will update it's most left and most right number about the 
    length of the sequence. So the upcoming left number and right number of it's most left and 
    most right number can know from them. If it has no left or right number it will update itself, 
    So that it's upcoming left and right number can know the length of the sequence from it.*/
  }
 
}
 
// Test
const solution = new Solution();
 
console.log(solution.longestConsecutive([100,4,200,1,3,2]));
// Expected: 4
 
console.log(solution.longestConsecutive([0,3,7,2,5,8,4,6,0,1]));
// Expected: 9
 
console.log(solution.longestConsecutive([1]));                       // 1
 
console.log(solution.longestConsecutive([]));                        // 0
 
console.log(solution.longestConsecutive([1,2,0,1]));                 // 3
 
console.log(solution.longestConsecutive([9,1,4,7,3,-1,0,5,8,-1,6]));
// Expected: 9
 
console.log(solution.longestConsecutive([1,3,5,7,9]));
// Expected: 1
 
 
/*
=== DETAILED STEP-BY-STEP TRACING (for the most complex and big example) ===
So you can clearly understand what happens in the algorithm.
Input = [100,4,200,1,3,2]

Map starts empty, res = 0

1. num = 100
   left=0, right=0 → length=1
   mp.set(100, 1)
   no left/right updates
   res = 1

2. num = 4
   left=0, right=0 → length=1
   mp.set(4, 1)
   res = 1

3. num = 200
   left=0, right=0 → length=1
   mp.set(200, 1)
   res = 1

4. num = 1
   left=0, right=0 → length=1
   mp.set(1, 1)
   res = 1

5. num = 3
   left=2? (no) = 0, right=4 (yes=1) → length=0+1+1=2
   mp.set(3, 2)
   left=0 → no update
   right=1 → mp.set(3+1=4, 2)   ← now 4 points to length 2
   res = 2

6. num = 2
   left=1 (yes=1), right=3 (yes=2) → length=1+2+1=4
   mp.set(2, 4)
   left=1 → mp.set(2-1=1, 4)   ← now 1 points to length 4
   right=2 → mp.set(2+2=4, 4)   ← now 4 points to length 4
   res = 4

Final Map state (only endpoints matter):
  100 → 1
  200 → 1
  1   → 4
  2   → 4
  3   → 2
  4   → 4

Final output (what you see in console.log()):
4
(1-2-3-4 forms the longest sequence — all merges happened in O(1) per element)
*/
 
}