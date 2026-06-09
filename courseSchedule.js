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

Time Complexity : O(N + E)   [N = numCourses, E = number of prerequisites]
Space Complexity:
  • O(N + E) for the adjacency list (preMap)
  • O(N) for the visiting set (recursion stack in worst case)

*/

class Solution {
  /**
   * @param {number} numCourses
   * @param {number[][]} prerequisites
   * @return {boolean}
   */

  canFinish(numCourses, prerequisites) {
    // Step 1: Build adjacency list (graph) - preMap[course] = list of prerequisites
    const preMap = new Map(); // course → [list of prerequisites] e.g. 2 → [0,1]
    for (let i = 0; i < numCourses; i++) { // Initialize with empty lists
      preMap.set(i, []); // making sure every course is in the map, even if it has no prerequisites           
    } // e.g. for numCourses = 3, preMap starts as: {0: [], 1: [], 2: []}
    for (let [crs, pre] of prerequisites) { // e.g. for prerequisites = [[1,0],[2,1]], we have:
      preMap.get(crs).push(pre); // update adjacency list with prerequisites 
    } // e.g. after processing prerequisites, preMap becomes: {0: [], 1: [0], 2: [1]}
    const visiting = new Set(); // to track courses in the current DFS path (for cycle detection)
    const dfs = (crs) => { // Returns true if course can be finished, false if a cycle is detected
      if (visiting.has(crs)) { // If current course is already in the visiting set, we have a cycle
        return false;              // Cycle detected!
      }
      if (preMap.get(crs).length === 0) { // check if the prerequisites list is empty (base case)
        return true;                     // No prerequisites left → course can be finished
      }
      visiting.add(crs); // Mark current course as being visited (part of current path)
      for (let pre of preMap.get(crs)) { // Looping through prerequisites of current course
        if (!dfs(pre)) { // doing the same DFS check for each prerequisite course
          return false;            // Cycle found in prerequisite chain
        }
      }
      visiting.delete(crs); // Remove from current path because it's preruquisites has no cycles with it
      preMap.set(crs, []); // Set prerequisites to empty to mark this course as "finished" (memoization)
      return true; // All prerequisites can be finished, so current course can be finished
    };
    for (let c = 0; c < numCourses; c++) { // Check each course to see if it can be finished
      if (!dfs(c)) { // If any course cannot be finished (cycle detected),
        return false;
      }
    }
    return true;
  }

}

// Test Cases
const solution = new Solution();

console.log(solution.canFinish(2, [[1,0]]));                    // true
console.log("");
console.log(solution.canFinish(2, [[1,0],[0,1]]));              // false
console.log("");
console.log(solution.canFinish(1, []));                         // true
console.log("");
console.log(solution.canFinish(3, [[1,0],[2,1],[0,2]]));       // false (cycle)
console.log("");
console.log(solution.canFinish(4, [[1,0],[2,1],[3,2]]));       // true
console.log("");

console.log(solution.canFinish(5, [[1,4],[2,4],[3,1],[3,2]])); // true

// console.log("");
// console.log(solution.canFinish(7, []));                         // true
}