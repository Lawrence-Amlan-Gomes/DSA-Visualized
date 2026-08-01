// nonOverlappingIntervals.js

export default function run() {
  /*
Given an array of intervals where intervals[i] = [starti, endi], 
return the minimum number of intervals you need to remove to make the rest 
of the intervals non-overlapping.

Note: Intervals that only 'touch' at a point (end == next start) are NOT overlapping.

Example 1:
Input: intervals = [[1,2],[2,3],[3,4],[1,3]]
Output: 1
Explanation: [1,3] can be removed and the rest of the intervals are non-overlapping.

Example 2:
Input: intervals = [[1,2],[1,2],[1,2]]
Output: 2
Explanation: You need to remove two [1,2] to make the rest non-overlapping.

Example 3:
Input: intervals = [[1,2],[2,3]]
Output: 0
Explanation: You don't need to remove any intervals.

Example 4:
Input: intervals = [[1,100],[11,22],[1,11],[2,12]]
Output: 2

Time Complexity : O(N log N)   [due to sorting]
Space Complexity: O(1)         [sorting is done in-place]

*/

  class Solution {
    /**
     * @param {number[][]} intervals
     * @return {number}
     */

    eraseOverlapIntervals(intervals) {
      let result = 0;
      console.log("result")
      console.log("Hi")
      return result;
    }
  }

  // Test Cases
  const solution = new Solution();

  console.log(
    solution.eraseOverlapIntervals([
      [1, 2],
      [2, 3],
      [3, 4],
      [1, 3],
    ]),
  ); // 1
  console.log(" ");

  console.log("100 test cases ------------------------");
  console.log(" ")
  // --- 100 Test Cases Batch (Silent on Success) ---
  let failures = 0;
  const test = (num, input, expected) => {
    const originalLog = console.log;
    console.log = () => {}; // Silence internal logs
    const result = solution.eraseOverlapIntervals(input);
    console.log = originalLog; // Restore logging

    if (result !== expected) {
      failures++;
      console.log(`${num}: ❌ Failed (Expected ${expected}, Got ${result})`);
    }
  };

  // 1
  // solution.eraseOverlapIntervals([])
  // Expected: 0
  test(1, [], 0);

  // 2
  // solution.eraseOverlapIntervals([[1,2]])
  // Expected: 0
  test(2, [[1, 2]], 0);

  // 3
  // solution.eraseOverlapIntervals([[1,2],[3,4]])
  // Expected: 0
  test(
    3,
    [
      [1, 2],
      [3, 4],
    ],
    0,
  );

  // 4
  // solution.eraseOverlapIntervals([[1,2],[2,3]])
  // Expected: 0
  test(
    4,
    [
      [1, 2],
      [2, 3],
    ],
    0,
  );

  // 5
  // solution.eraseOverlapIntervals([[1,3],[2,4]])
  // Expected: 1
  test(
    5,
    [
      [1, 3],
      [2, 4],
    ],
    1,
  );

  // 6
  // solution.eraseOverlapIntervals([[1,2],[1,2]])
  // Expected: 1
  test(
    6,
    [
      [1, 2],
      [1, 2],
    ],
    1,
  );

  // 7
  // solution.eraseOverlapIntervals([[1,2],[2,3],[3,4]])
  // Expected: 0
  test(
    7,
    [
      [1, 2],
      [2, 3],
      [3, 4],
    ],
    0,
  );

  // 8
  // solution.eraseOverlapIntervals([[1,5],[2,3],[3,4]])
  // Expected: 1
  test(
    8,
    [
      [1, 5],
      [2, 3],
      [3, 4],
    ],
    1,
  );

  // 9
  // solution.eraseOverlapIntervals([[1,2],[1,2],[1,2]])
  // Expected: 2
  test(
    9,
    [
      [1, 2],
      [1, 2],
      [1, 2],
    ],
    2,
  );

  // 10
  // solution.eraseOverlapIntervals([[1,10],[2,3],[4,5]])
  // Expected: 1
  test(
    10,
    [
      [1, 10],
      [2, 3],
      [4, 5],
    ],
    1,
  );

  // 11
  // solution.eraseOverlapIntervals([[-10,-5],[-8,-3],[-6,-1]])
  // Expected: 2
  test(
    11,
    [
      [-10, -5],
      [-8, -3],
      [-6, -1],
    ],
    2,
  );

  // 12
  // solution.eraseOverlapIntervals([[-9,-4],[-7,-2],[-5,0]])
  // Expected: 2
  test(
    12,
    [
      [-9, -4],
      [-7, -2],
      [-5, 0],
    ],
    2,
  );

  // 13
  // solution.eraseOverlapIntervals([[-8,-3],[-6,-1],[-4,1]])
  // Expected: 2
  test(
    13,
    [
      [-8, -3],
      [-6, -1],
      [-4, 1],
    ],
    2,
  );

  // 14
  // solution.eraseOverlapIntervals([[-7,-2],[-5,0],[-3,2]])
  // Expected: 2
  test(
    14,
    [
      [-7, -2],
      [-5, 0],
      [-3, 2],
    ],
    2,
  );

  // 15
  // solution.eraseOverlapIntervals([[-6,-1],[-4,1],[-2,3]])
  // Expected: 2
  test(
    15,
    [
      [-6, -1],
      [-4, 1],
      [-2, 3],
    ],
    2,
  );

  // 16
  // solution.eraseOverlapIntervals([[-5,0],[-3,2],[-1,4]])
  // Expected: 2
  test(
    16,
    [
      [-5, 0],
      [-3, 2],
      [-1, 4],
    ],
    2,
  );

  // 17
  // solution.eraseOverlapIntervals([[-4,1],[-2,3],[0,5]])
  // Expected: 2
  test(
    17,
    [
      [-4, 1],
      [-2, 3],
      [0, 5],
    ],
    2,
  );

  // 18
  // solution.eraseOverlapIntervals([[-3,2],[-1,4],[1,6]])
  // Expected: 2
  test(
    18,
    [
      [-3, 2],
      [-1, 4],
      [1, 6],
    ],
    2,
  );

  // 19
  // solution.eraseOverlapIntervals([[-2,3],[0,5],[2,7]])
  // Expected: 2
  test(
    19,
    [
      [-2, 3],
      [0, 5],
      [2, 7],
    ],
    2,
  );

  // 20
  // solution.eraseOverlapIntervals([[-1,4],[1,6],[3,8]])
  // Expected: 2
  test(
    20,
    [
      [-1, 4],
      [1, 6],
      [3, 8],
    ],
    2,
  );

  // 21
  // solution.eraseOverlapIntervals([[1000000,2000000],[1500000,2500000]])
  // Expected: 1
  test(
    21,
    [
      [1000000, 2000000],
      [1500000, 2500000],
    ],
    1,
  );

  // 22
  // solution.eraseOverlapIntervals([[1000001,2000001],[1500001,2500001]])
  // Expected: 1
  test(
    22,
    [
      [1000001, 2000001],
      [1500001, 2500001],
    ],
    1,
  );

  // 23
  // solution.eraseOverlapIntervals([[1000002,2000002],[1500002,2500002]])
  // Expected: 1
  test(
    23,
    [
      [1000002, 2000002],
      [1500002, 2500002],
    ],
    1,
  );

  // 24
  // solution.eraseOverlapIntervals([[1000003,2000003],[1500003,2500003]])
  // Expected: 1
  test(
    24,
    [
      [1000003, 2000003],
      [1500003, 2500003],
    ],
    1,
  );

  // 25
  // solution.eraseOverlapIntervals([[1000004,2000004],[1500004,2500004]])
  // Expected: 1
  test(
    25,
    [
      [1000004, 2000004],
      [1500004, 2500004],
    ],
    1,
  );

  // 26
  // solution.eraseOverlapIntervals([[1000005,2000005],[1500005,2500005]])\
  // Expected: 1
  test(
    26,
    [
      [1000005, 2000005],
      [1500005, 2500005],
    ],
    1,
  );

  // 27
  // solution.eraseOverlapIntervals([[1000006,2000006],[1500006,2500006]])
  // Expected: 1
  test(
    27,
    [
      [1000006, 2000006],
      [1500006, 2500006],
    ],
    1,
  );

  // 28
  // solution.eraseOverlapIntervals([[1000007,2000007],[1500007,2500007]])
  // Expected: 1
  test(
    28,
    [
      [1000007, 2000007],
      [1500007, 2500007],
    ],
    1,
  );

  // 29
  // solution.eraseOverlapIntervals([[1000008,2000008],[1500008,2500008]])
  // Expected: 1
  test(
    29,
    [
      [1000008, 2000008],
      [1500008, 2500008],
    ],
    1,
  );

  // 30
  // solution.eraseOverlapIntervals([[1000009,2000009],[1500009,2500009]])
  // Expected: 1
  test(
    30,
    [
      [1000009, 2000009],
      [1500009, 2500009],
    ],
    1,
  );

  // 31
  // solution.eraseOverlapIntervals([[0,100],[0,99]])
  // Expected: 1
  test(
    31,
    [
      [0, 100],
      [0, 99],
    ],
    1,
  );

  // 32
  // solution.eraseOverlapIntervals([[0,100],[0,99],[0,98]])
  // Expected: 2
  test(
    32,
    [
      [0, 100],
      [0, 99],
      [0, 98],
    ],
    2,
  );

  // 33
  // solution.eraseOverlapIntervals([[0,100],[0,99],[0,98],[0,97]])
  // Expected: 3
  test(
    33,
    [
      [0, 100],
      [0, 99],
      [0, 98],
      [0, 97],
    ],
    3,
  );

  // 34
  // solution.eraseOverlapIntervals([[0,100],[0,99],[0,98],[0,97],[0,96]])
  // Expected: 4
  test(
    34,
    [
      [0, 100],
      [0, 99],
      [0, 98],
      [0, 97],
      [0, 96],
    ],
    4,
  );

  // 35
  // solution.eraseOverlapIntervals([[0,100],[0,99],[0,98],[0,97],[0,96],[0,95]])
  // Expected: 5
  test(
    35,
    [
      [0, 100],
      [0, 99],
      [0, 98],
      [0, 97],
      [0, 96],
      [0, 95],
    ],
    5,
  );

  // 36
  // solution.eraseOverlapIntervals([[0,100],[0,99],[0,98],[0,97],[0,96],[0,95],[0,94]])
  // Expected: 6
  test(
    36,
    [
      [0, 100],
      [0, 99],
      [0, 98],
      [0, 97],
      [0, 96],
      [0, 95],
      [0, 94],
    ],
    6,
  );

  // 37
  // solution.eraseOverlapIntervals([[0,100],[0,99],[0,98],[0,97],[0,96],[0,95],[0,94],[0,93]])
  // Expected: 7
  test(
    37,
    [
      [0, 100],
      [0, 99],
      [0, 98],
      [0, 97],
      [0, 96],
      [0, 95],
      [0, 94],
      [0, 93],
    ],
    7,
  );

  // 38
  // solution.eraseOverlapIntervals([[0,100],[0,99],[0,98],[0,97],[0,96],[0,95],[0,94],[0,93],[0,92]])
  // Expected: 8
  test(
    38,
    [
      [0, 100],
      [0, 99],
      [0, 98],
      [0, 97],
      [0, 96],
      [0, 95],
      [0, 94],
      [0, 93],
      [0, 92],
    ],
    8,
  );

  // 39
  // solution.eraseOverlapIntervals([[0,100],[0,99],[0,98],[0,97],[0,96],[0,95],[0,94],[0,93],[0,92],[0,91]])
  // Expected: 9
  test(
    39,
    [
      [0, 100],
      [0, 99],
      [0, 98],
      [0, 97],
      [0, 96],
      [0, 95],
      [0, 94],
      [0, 93],
      [0, 92],
      [0, 91],
    ],
    9,
  );

  // 40
  // solution.eraseOverlapIntervals([[0,100],[0,99],[0,98],[0,97],[0,96],[0,95],[0,94],[0,93],[0,92],[0,91],[0,90]])
  // Expected: 10
  test(
    40,
    [
      [0, 100],
      [0, 99],
      [0, 98],
      [0, 97],
      [0, 96],
      [0, 95],
      [0, 94],
      [0, 93],
      [0, 92],
      [0, 91],
      [0, 90],
    ],
    10,
  );

  // 41
  // solution.eraseOverlapIntervals([[10,11],[10,12]])
  // Expected: 1
  test(
    41,
    [
      [10, 11],
      [10, 12],
    ],
    1,
  );

  // 42
  // solution.eraseOverlapIntervals([[10,11],[10,12],[10,13]])
  // Expected: 2
  test(
    42,
    [
      [10, 11],
      [10, 12],
      [10, 13],
    ],
    2,
  );

  // 43
  // solution.eraseOverlapIntervals([[10,11],[10,12],[10,13],[10,14]])
  // Expected: 3
  test(
    43,
    [
      [10, 11],
      [10, 12],
      [10, 13],
      [10, 14],
    ],
    3,
  );

  // 44
  // solution.eraseOverlapIntervals([[10,11],[10,12],[10,13],[10,14],[10,15]])
  // Expected: 4
  test(
    44,
    [
      [10, 11],
      [10, 12],
      [10, 13],
      [10, 14],
      [10, 15],
    ],
    4,
  );

  // 45
  // solution.eraseOverlapIntervals([[10,11],[10,12],[10,13],[10,14],[10,15],[10,16]])
  // Expected: 5
  test(
    45,
    [
      [10, 11],
      [10, 12],
      [10, 13],
      [10, 14],
      [10, 15],
      [10, 16],
    ],
    5,
  );

  // 46
  // solution.eraseOverlapIntervals([[10,11],[10,12],[10,13],[10,14],[10,15],[10,16],[10,17]])
  // Expected: 6
  test(
    46,
    [
      [10, 11],
      [10, 12],
      [10, 13],
      [10, 14],
      [10, 15],
      [10, 16],
      [10, 17],
    ],
    6,
  );

  // 47
  // solution.eraseOverlapIntervals([[10,11],[10,12],[10,13],[10,14],[10,15],[10,16],[10,17],[10,18]])
  // Expected: 7
  test(
    47,
    [
      [10, 11],
      [10, 12],
      [10, 13],
      [10, 14],
      [10, 15],
      [10, 16],
      [10, 17],
      [10, 18],
    ],
    7,
  );

  // 48
  // solution.eraseOverlapIntervals([[10,11],[10,12],[10,13],[10,14],[10,15],[10,16],[10,17],[10,18],[10,19]])
  // Expected: 8
  test(
    48,
    [
      [10, 11],
      [10, 12],
      [10, 13],
      [10, 14],
      [10, 15],
      [10, 16],
      [10, 17],
      [10, 18],
      [10, 19],
    ],
    8,
  );

  // 49
  // solution.eraseOverlapIntervals([[10,11],[10,12],[10,13],[10,14],[10,15],[10,16],[10,17],[10,18],[10,19],[10,20]])
  // Expected: 9
  test(
    49,
    [
      [10, 11],
      [10, 12],
      [10, 13],
      [10, 14],
      [10, 15],
      [10, 16],
      [10, 17],
      [10, 18],
      [10, 19],
      [10, 20],
    ],
    9,
  );

  // 50
  // solution.eraseOverlapIntervals([[10,11],[10,12],[10,13],[10,14],[10,15],[10,16],[10,17],[10,18],[10,19],[10,20],[10,21]])
  // Expected: 10
  test(
    50,
    [
      [10, 11],
      [10, 12],
      [10, 13],
      [10, 14],
      [10, 15],
      [10, 16],
      [10, 17],
      [10, 18],
      [10, 19],
      [10, 20],
      [10, 21],
    ],
    10,
  );

  // 51
  // solution.eraseOverlapIntervals([[9,10],[8,10]])
  // Expected: 1
  test(
    51,
    [
      [9, 10],
      [8, 10],
    ],
    1,
  );

  // 52
  // solution.eraseOverlapIntervals([[9,10],[8,10],[7,10]])
  // Expected: 2
  test(
    52,
    [
      [9, 10],
      [8, 10],
      [7, 10],
    ],
    2,
  );

  // 53
  // solution.eraseOverlapIntervals([[9,10],[8,10],[7,10],[6,10]])
  // Expected: 3
  test(
    53,
    [
      [9, 10],
      [8, 10],
      [7, 10],
      [6, 10],
    ],
    3,
  );

  // 54
  // solution.eraseOverlapIntervals([[9,10],[8,10],[7,10],[6,10],[5,10]])
  // Expected: 4
  test(
    54,
    [
      [9, 10],
      [8, 10],
      [7, 10],
      [6, 10],
      [5, 10],
    ],
    4,
  );

  // 55
  // solution.eraseOverlapIntervals([[9,10],[8,10],[7,10],[6,10],[5,10],[4,10]])
  // Expected: 5
  test(
    55,
    [
      [9, 10],
      [8, 10],
      [7, 10],
      [6, 10],
      [5, 10],
      [4, 10],
    ],
    5,
  );

  // 56
  // solution.eraseOverlapIntervals([[9,10],[8,10],[7,10],[6,10],[5,10],[4,10],[3,10]])
  // Expected: 6
  test(
    56,
    [
      [9, 10],
      [8, 10],
      [7, 10],
      [6, 10],
      [5, 10],
      [4, 10],
      [3, 10],
    ],
    6,
  );

  // 57
  // solution.eraseOverlapIntervals([[9,10],[8,10],[7,10],[6,10],[5,10],[4,10],[3,10],[2,10]])
  // Expected: 7
  test(
    57,
    [
      [9, 10],
      [8, 10],
      [7, 10],
      [6, 10],
      [5, 10],
      [4, 10],
      [3, 10],
      [2, 10],
    ],
    7,
  );

  // 58
  // solution.eraseOverlapIntervals([[9,10],[8,10],[7,10],[6,10],[5,10],[4,10],[3,10],[2,10],[1,10]])
  // Expected: 8
  test(
    58,
    [
      [9, 10],
      [8, 10],
      [7, 10],
      [6, 10],
      [5, 10],
      [4, 10],
      [3, 10],
      [2, 10],
      [1, 10],
    ],
    8,
  );

  // 59
  // solution.eraseOverlapIntervals([[9,10],[8,10],[7,10],[6,10],[5,10],[4,10],[3,10],[2,10],[1,10],[0,10]])
  // Expected: 9
  test(
    59,
    [
      [9, 10],
      [8, 10],
      [7, 10],
      [6, 10],
      [5, 10],
      [4, 10],
      [3, 10],
      [2, 10],
      [1, 10],
      [0, 10],
    ],
    9,
  );

  // 60
  // solution.eraseOverlapIntervals([[9,10],[8,10],[7,10],[6,10],[5,10],[4,10],[3,10],[2,10],[1,10],[0,10],[-1,10]])
  // Expected: 10
  test(
    60,
    [
      [9, 10],
      [8, 10],
      [7, 10],
      [6, 10],
      [5, 10],
      [4, 10],
      [3, 10],
      [2, 10],
      [1, 10],
      [0, 10],
      [-1, 10],
    ],
    10,
  );

  // 61
  // solution.eraseOverlapIntervals([[0,1],[1,2]])
  // Expected: 0
  test(
    61,
    [
      [0, 1],
      [1, 2],
    ],
    0,
  );

  // 62
  // solution.eraseOverlapIntervals([[0,1],[1,2],[2,3],[3,4]])
  // Expected: 0
  test(
    62,
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
    0,
  );

  // 63
  // solution.eraseOverlapIntervals([[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]])
  // Expected: 0
  test(
    63,
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
    0,
  );

  // 64
  // solution.eraseOverlapIntervals([[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]])
  // Expected: 0
  test(
    64,
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
    ],
    0,
  );

  // 65
  // solution.eraseOverlapIntervals([[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10]])
  // Expected: 0
  test(
    65,
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
    ],
    0,
  );

  // 66
  // solution.eraseOverlapIntervals([[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12]])
  // Expected: 0
  test(
    66,
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 12],
    ],
    0,
  );

  // 67
  // solution.eraseOverlapIntervals([[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14]])
  // Expected: 0
  test(
    67,
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      [12, 13],
      [13, 14],
    ],
    0,
  );

  // 68
  // solution.eraseOverlapIntervals([[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16]])
  // Expected: 0
  test(
    68,
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      [12, 13],
      [13, 14],
      [14, 15],
      [15, 16],
    ],
    0,
  );

  // 69
  // solution.eraseOverlapIntervals([[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18]])
  // Expected: 0
  test(
    69,
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      [12, 13],
      [13, 14],
      [14, 15],
      [15, 16],
      [16, 17],
      [17, 18],
    ],
    0,
  );

  // 70
  // solution.eraseOverlapIntervals([[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18],[18,19],[19,20]])
  // Expected: 0
  test(
    70,
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      [12, 13],
      [13, 14],
      [14, 15],
      [15, 16],
      [16, 17],
      [17, 18],
      [18, 19],
      [19, 20],
    ],
    0,
  );

  // 71
  // solution.eraseOverlapIntervals([[0,2],[1,3]])
  // Expected: 1
  test(
    71,
    [
      [0, 2],
      [1, 3],
    ],
    1,
  );

  // 72
  // solution.eraseOverlapIntervals([[0,2],[1,3],[2,4],[3,5]])
  // Expected: 2
  test(
    72,
    [
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
    ],
    2,
  );

  // 73
  // solution.eraseOverlapIntervals([[0,2],[1,3],[2,4],[3,5],[4,6],[5,7]])
  // Expected: 3
  test(
    73,
    [
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 7],
    ],
    3,
  );

  // 74
  // solution.eraseOverlapIntervals([[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,8],[7,9]])
  // Expected: 4
  test(
    74,
    [
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [6, 8],
      [7, 9],
    ],
    4,
  );

  // 75
  // solution.eraseOverlapIntervals([[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,8],[7,9],[8,10],[9,11]])
  // Expected: 5
  test(
    75,
    [
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [6, 8],
      [7, 9],
      [8, 10],
      [9, 11],
    ],
    5,
  );

  // 76
  // solution.eraseOverlapIntervals([[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,8],[7,9],[8,10],[9,11],[10,12],[11,13]])
  // Expected: 6
  test(
    76,
    [
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [6, 8],
      [7, 9],
      [8, 10],
      [9, 11],
      [10, 12],
      [11, 13],
    ],
    6,
  );

  // 77
  // solution.eraseOverlapIntervals([[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,8],[7,9],[8,10],[9,11],[10,12],[11,13],[12,14],[13,15]])
  // Expected: 7
  test(
    77,
    [
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [6, 8],
      [7, 9],
      [8, 10],
      [9, 11],
      [10, 12],
      [11, 13],
      [12, 14],
      [13, 15],
    ],
    7,
  );

  // 78
  // solution.eraseOverlapIntervals([[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,8],[7,9],[8,10],[9,11],[10,12],[11,13],[12,14],[13,15],[14,16],[15,17]])
  // Expected: 8
  test(
    78,
    [
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [6, 8],
      [7, 9],
      [8, 10],
      [9, 11],
      [10, 12],
      [11, 13],
      [12, 14],
      [13, 15],
      [14, 16],
      [15, 17],
    ],
    8,
  );

  // 79
  // solution.eraseOverlapIntervals([[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,8],[7,9],[8,10],[9,11],[10,12],[11,13],[12,14],[13,15],[14,16],[15,17],[16,18],[17,19]])
  // Expected: 9
  test(
    79,
    [
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [6, 8],
      [7, 9],
      [8, 10],
      [9, 11],
      [10, 12],
      [11, 13],
      [12, 14],
      [13, 15],
      [14, 16],
      [15, 17],
      [16, 18],
      [17, 19],
    ],
    9,
  );

  // 80
  // solution.eraseOverlapIntervals([[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,8],[7,9],[8,10],[9,11],[10,12],[11,13],[12,14],[13,15],[14,16],[15,17],[16,18],[17,19],[18,20],[19,21]])
  // Expected: 10
  test(
    80,
    [
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 7],
      [6, 8],
      [7, 9],
      [8, 10],
      [9, 11],
      [10, 12],
      [11, 13],
      [12, 14],
      [13, 15],
      [14, 16],
      [15, 17],
      [16, 18],
      [17, 19],
      [18, 20],
      [19, 21],
    ],
    10,
  );

  // 81
  // solution.eraseOverlapIntervals([[6,18],[45,52],[18,24],[47,67],[41,55],[12,26],[33,51],[23,40],[19,34],[2,13]])
  // Expected: 7
  test(
    81,
    [
      [6, 18],
      [45, 52],
      [18, 24],
      [47, 67],
      [41, 55],
      [12, 26],
      [33, 51],
      [23, 40],
      [19, 34],
      [2, 13],
    ],
    7,
  );

  // 82
  // solution.eraseOverlapIntervals([[22,36],[22,36],[25,30],[24,29],[0,16],[44,48],[25,30],[9,15],[46,56]])
  // Expected: 6
  test(
    82,
    [
      [22, 36],
      [22, 36],
      [25, 30],
      [24, 29],
      [0, 16],
      [44, 48],
      [25, 30],
      [9, 15],
      [46, 56],
    ],
    6,
  );

  // 83
  // solution.eraseOverlapIntervals([[16,36],[45,55],[13,14],[24,43],[29,47],[19,33],[26,44],[37,42],[23,33],[9,26]])
  // Expected: 6
  test(
    83,
    [
      [16, 36],
      [45, 55],
      [13, 14],
      [24, 43],
      [29, 47],
      [19, 33],
      [26, 44],
      [37, 42],
      [23, 33],
      [9, 26],
    ],
    6,
  );

  // 84
  // solution.eraseOverlapIntervals([[10,26],[14,30],[8,28],[4,17],[21,24],[27,34],[2,7],[0,1],[4,8]])
  // Expected: 5
  test(
    84,
    [
      [10, 26],
      [14, 30],
      [8, 28],
      [4, 17],
      [21, 24],
      [27, 34],
      [2, 7],
      [0, 1],
      [4, 8],
    ],
    5,
  );

  // 85
  // solution.eraseOverlapIntervals([[10,11],[29,48],[33,47]])
  // Expected: 1
  test(
    85,
    [
      [10, 11],
      [29, 48],
      [33, 47],
    ],
    1,
  );

  // 86
  // solution.eraseOverlapIntervals([[26,37],[14,34],[22,34],[9,25]])
  // Expected: 2
  test(
    86,
    [
      [26, 37],
      [14, 34],
      [22, 34],
      [9, 25],
    ],
    2,
  );

  // 87
  // solution.eraseOverlapIntervals([[49,57],[25,36],[39,41],[28,40],[11,24],[17,21],[11,19],[8,26],[33,42]])
  // Expected: 5
  test(
    87,
    [
      [49, 57],
      [25, 36],
      [39, 41],
      [28, 40],
      [11, 24],
      [17, 21],
      [11, 19],
      [8, 26],
      [33, 42],
    ],
    5,
  );

  // 88
  // solution.eraseOverlapIntervals([[45,55],[30,48],[45,58],[43,55]])
  // Expected: 3
  test(
    88,
    [
      [45, 55],
      [30, 48],
      [45, 58],
      [43, 55],
    ],
    3,
  );

  // 89
  // solution.eraseOverlapIntervals([[26,34],[35,37],[6,11]])
  // Expected: 0
  test(
    89,
    [
      [26, 34],
      [35, 37],
      [6, 11],
    ],
    0,
  );

  // 90
  // solution.eraseOverlapIntervals([[4,23],[21,29],[46,54],[9,11],[26,30],[5,16],[34,47],[26,37],[5,17],[0,18]])
  // Expected: 7
  test(
    90,
    [
      [4, 23],
      [21, 29],
      [46, 54],
      [9, 11],
      [26, 30],
      [5, 16],
      [34, 47],
      [26, 37],
      [5, 17],
      [0, 18],
    ],
    7,
  );

  // 91
  // solution.eraseOverlapIntervals([[7,8],[10,27],[45,55],[25,36]])
  // Expected: 1
  test(
    91,
    [
      [7, 8],
      [10, 27],
      [45, 55],
      [25, 36],
    ],
    1,
  );

  // 92
  // solution.eraseOverlapIntervals([[35,53],[29,49],[39,49],[7,13],[49,68],[9,22],[34,42],[11,20]])
  // Expected: 5
  test(
    92,
    [
      [35, 53],
      [29, 49],
      [39, 49],
      [7, 13],
      [49, 68],
      [9, 22],
      [34, 42],
      [11, 20],
    ],
    5,
  );

  // 93
  // solution.eraseOverlapIntervals([[26,33],[3,23],[19,32],[1,2],[43,58]])
  // Expected: 1
  test(
    93,
    [
      [26, 33],
      [3, 23],
      [19, 32],
      [1, 2],
      [43, 58],
    ],
    1,
  );

  // 94
  // solution.eraseOverlapIntervals([[45,47],[16,34],[19,27]])
  // Expected: 1
  test(
    94,
    [
      [45, 47],
      [16, 34],
      [19, 27],
    ],
    1,
  );

  // 95
  // solution.eraseOverlapIntervals([[22,24],[6,7],[17,30],[44,51],[42,50]])
  // Expected: 2
  test(
    95,
    [
      [22, 24],
      [6, 7],
      [17, 30],
      [44, 51],
      [42, 50],
    ],
    2,
  );

  // 96
  // solution.eraseOverlapIntervals([[4,24],[39,54],[16,26],[46,49]])
  // Expected: 2
  test(
    96,
    [
      [4, 24],
      [39, 54],
      [16, 26],
      [46, 49],
    ],
    2,
  );

  // 97
  // solution.eraseOverlapIntervals([[5,6],[19,20],[4,5],[22,35],[31,43]])
  // Expected: 1
  test(
    97,
    [
      [5, 6],
      [19, 20],
      [4, 5],
      [22, 35],
      [31, 43],
    ],
    1,
  );

  // 98
  // solution.eraseOverlapIntervals([[8,18],[4,15],[34,37],[7,9],[11,15],[43,62],[23,25],[23,42]])
  // Expected: 3
  test(
    98,
    [
      [8, 18],
      [4, 15],
      [34, 37],
      [7, 9],
      [11, 15],
      [43, 62],
      [23, 25],
      [23, 42],
    ],
    3,
  );

  // 99
  // solution.eraseOverlapIntervals([[2,20],[17,24],[2,16],[46,55],[30,47],[18,32]])
  // Expected: 3
  test(
    99,
    [
      [2, 20],
      [17, 24],
      [2, 16],
      [46, 55],
      [30, 47],
      [18, 32],
    ],
    3,
  );

  // 100
  // solution.eraseOverlapIntervals([[11,18],[11,23],[13,16],[24,42]])
  // Expected: 2
  test(
    100,
    [
      [11, 18],
      [11, 23],
      [13, 16],
      [24, 42],
    ],
    2,
  );

  if (failures === 0) console.log("✅ All success");
}
