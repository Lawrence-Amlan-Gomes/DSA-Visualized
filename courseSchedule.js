// courseSchedule.js

export default function run() {
  /*
There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1.
You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates
that you must take course bi first if you want to take course ai.

Return true if you can finish all courses. Otherwise, return false.

Example 1:
Input: numCourses = 2, prerequisites = [[1,0]]
Output: true
Explanation: There are a total of 2 courses to take.
To take course 1 you should have finished course 0. So it is possible.

Example 2:
Input: numCourses = 2, prerequisites = [[1,0],[0,1]]
Output: false
Explanation: There are a total of 2 courses to take.
To take course 1 you should have finished course 0, and to take course 0
you should also have finished course 1. So it is impossible.

Example 3:
Input: numCourses = 1, prerequisites = []
Output: true

Time Complexity : ?
Space Complexity: ?

*/

  class Solution {
    /**
     * @param {number} numCourses
     * @param {number[][]} prerequisites
     * @return {boolean}
     */

    canFinish(numCourses, prerequisites) {
      const preMap = new Map();
      for (let i = 0; i < numCourses; i++) preMap.set(i, []);
      for (const [crs, pre] of prerequisites) preMap.get(crs).push(pre);

      const visiting = new Set();

      function dfs(crs) {
        if (visiting.has(crs)) return false; // cycle!
        if (preMap.get(crs).length === 0) return true; // no prereqs left — safe

        visiting.add(crs);
        for (const pre of preMap.get(crs)) {
          if (!dfs(pre)) return false;
        }
        visiting.delete(crs);
        preMap.set(crs, []); // memoize: this course (and its chain) is confirmed safe
        return true;
      }

      for (let c = 0; c < numCourses; c++) {
        if (!dfs(c)) return false;
      }
      return true;
      // Time: O(N + E) — building the adjacency list is O(N + E), and memoization (clearing a course's prereq list once it's confirmed safe) means no course's chain gets fully re-walked twice. Space: O(N + E) for the adjacency list, plus O(N) for the visiting set and recursion stack
    }
  }

  // Test Cases
  const solution = new Solution();

  console.log(solution.canFinish(2, [[1, 0]])); // Expected: true
  console.log("");
  console.log(
    solution.canFinish(2, [
      [1, 0],
      [0, 1],
    ]),
  ); // Expected: false
  console.log("");
  console.log(solution.canFinish(1, [])); // Expected: true
  console.log("");
  console.log(
    solution.canFinish(3, [
      [1, 0],
      [2, 1],
      [0, 2],
    ]),
  ); // Expected: false (cycle)
  console.log("");
  console.log(
    solution.canFinish(4, [
      [1, 0],
      [2, 1],
      [3, 2],
    ]),
  ); // Expected: true
  console.log("");
  console.log(
    solution.canFinish(5, [
      [1, 4],
      [2, 4],
      [3, 1],
      [3, 2],
    ]),
  ); // Expected: true
}
