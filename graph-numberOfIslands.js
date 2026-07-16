// numberOfIslands.js
export default function run() {
  /*
Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water),
return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.
You may assume all four edges of the grid are all surrounded by water.

Example 1:
Input: grid = [
  ["1","1","1","1","0"],
  ["1","1","0","1","0"],
  ["1","1","0","0","0"],
  ["0","0","0","0","0"]
]
Output: 1

Example 2:
Input: grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]
Output: 3

Example 3:
Input: grid = [
  ["1","0","1","1","0"],
  ["1","0","0","1","0"],
  ["0","1","0","0","1"]
]
Output: 4

Time Complexity : ?
Space Complexity: ?
*/

  class Solution {
    /**
     * @param {character[][]} grid
     * @return {number}
     */

    numIslands(grid) {
      const ROWS = grid.length,
        COLS = grid[0].length;
      let islands = 0;

      function dfs(r, c) {
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS || grid[r][c] === "0")
          return;
        grid[r][c] = "0"; // sink it so it's never revisited
        dfs(r + 1, c);
        dfs(r - 1, c);
        dfs(r, c + 1);
        dfs(r, c - 1);
      }

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c] === "1") {
            islands++;
            dfs(r, c);
          }
        }
      }
      return islands;
      // Time: O(M×N) — every cell is visited (and sunk) at most once across the whole run, no matter how the flood fills spread out. Space: O(M×N) worst case — if the entire grid is land, the DFS recursion stack can go as deep as the total cell count.
    }
  }

  // Test Cases
  const solution = new Solution();

  const grid1 = [
    ["1", "1", "1", "1", "0"],
    ["1", "1", "0", "1", "0"],
    ["1", "1", "0", "0", "0"],
    ["0", "0", "0", "0", "0"],
  ];
  console.log(solution.numIslands(grid1)); // Expected: 1

  console.log("");

  const grid2 = [
    ["1", "1", "1", "0", "0"],
    ["1", "1", "0", "0", "0"],
    ["1", "0", "1", "0", "0"],
    ["0", "0", "0", "1", "1"],
  ];
  console.log(solution.numIslands(grid2)); // Expected: 3

  console.log("");

  const grid3 = [
    ["1", "0", "1", "1", "0"],
    ["1", "0", "0", "1", "0"],
    ["0", "1", "0", "0", "1"],
  ];
  console.log(solution.numIslands(grid3)); // Expected: 4

  console.log("");

  const grid4 = [["1"]];
  console.log(solution.numIslands(grid4)); // Expected: 1

  console.log("");

  const grid5 = [["0"]];
  console.log(solution.numIslands(grid5)); // Expected: 0

  console.log("");

  const grid6 = [
    ["1", "1", "1"],
    ["0", "1", "0"],
    ["1", "1", "1"],
  ];
  console.log(solution.numIslands(grid6)); // Expected: 1
}
