// meetingRoomsII.js
export default function run() {
/*
Given an array of meeting time intervals consisting of start and end times 
intervals[i] = [starti, endi], return the minimum number of conference rooms required.

Note: You may assume the intervals are given in no particular order.

Example 1:
Input: intervals = [[0,30],[5,10],[15,20]]
Output: 2
Explanation: We need 2 rooms. 
Room1: [0,30], Room2: [5,10] and [15,20]

Example 2:
Input: intervals = [[7,10],[2,4]]
Output: 1

Example 3:
Input: intervals = [[1,5],[8,9],[8,9],[13,15]]
Output: 2

Example 4:
Input: intervals = [[0,30],[5,10],[15,20],[10,15]]
Output: 2

Time Complexity : O(N log N)   [due to sorting 2N events]
Space Complexity: O(N)         [for the timeline array]

*/

class Solution {
  /**
   * @param {Interval[]} intervals
   * @returns {number}
   */

  minMeetingRooms(intervals) {
    if (intervals.length === 0) return 0; // edge case: no meetings → no rooms needed
    const time = []; // timeline events: [time, type] where type is +1 for start, -1 for end
    for (const i of intervals) { // Create events for all start and end times
      time.push([i.start, 1]);   // start event
      time.push([i.end, -1]);    // end event
    } // e.g. [[0,30],[5,10],[15,20]] → time = [[0,1],[30,-1],[5,1],[10,-1],[15,1],[20,-1]]
    time.sort((a, b) => { // Sort events by time, and if times are equal, prioritize end events
      if (a[0] === b[0]) { // If times are equal, prioritize end time first to free up rooms
        return a[1] - b[1]; // e.g. for time = [[5,1],[5,-1]] -> after sorting: [[5,-1],[5,1]]
      } // Otherwise, sort by time
      return a[0] - b[0]; // e.g. for time = [[5,1],[4,-1]] -> after sorting: [[4,-1],[5,1]]
    }); // new time array after sorting: [[0,1],[5,1],[10,-1],[15,1],[20,-1],[30,-1]]
    let res = 0;     // max rooms needed
    let count = 0;   // current active meetings
    for (const t of time) { // Traverse the sorted events
      count += t[1]; // +1 for start of meeting, -1 for end of meeting
      res = Math.max(res, count);  // track maximum
    }
    return res;
  }

}

// Test Cases
const solution = new Solution();

// Helper to create Interval objects for testing
function Interval(start, end) {
  this.start = start;
  this.end = end;
}

console.log(solution.minMeetingRooms([
  new Interval(0,30),
  new Interval(5,10),
  new Interval(15,20)
]));  // 2

console.log("");
console.log(solution.minMeetingRooms([
  new Interval(7,10),
  new Interval(2,4)
]));  // 1

console.log("");
console.log(solution.minMeetingRooms([
  new Interval(1,5),
  new Interval(8,9),
  new Interval(8,9),
  new Interval(13,15)
]));  // 2

console.log("");
console.log(solution.minMeetingRooms([
  new Interval(0,30),
  new Interval(5,10),
  new Interval(15,20),
  new Interval(10,15)
]));  // 2

console.log("");
console.log(solution.minMeetingRooms([]));                    // 0
console.log("");
console.log(solution.minMeetingRooms([new Interval(1,10)])); // 1
console.log("");
console.log(solution.minMeetingRooms([
  new Interval(1,3), new Interval(2,4), new Interval(3,5), new Interval(4,6)
]));  // 2
console.log("");

console.log(solution.minMeetingRooms([
  new Interval(9,10), new Interval(9,11), new Interval(10,12), new Interval(11,13)
]));  // 2

}