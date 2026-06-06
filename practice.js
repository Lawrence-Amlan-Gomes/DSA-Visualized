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

Time Complexity : O(M × N)  
Space Complexity: O(M × N)  [worst case recursion stack when the entire grid is land]

This is the MOST OPTIMAL solution (DFS flood fill / graph traversal).
We modify the grid in-place to mark visited cells (no extra visited set needed).
*/

class Solution {
    /**
     * @param {character[][]} grid
     * @return {number}
     */

    numIslands(grid) {
        if (!grid || !grid.length || !grid[0].length) return 0; // Edge case: empty grid
        const directions = [ // 4 possible directions from each cell
            [1, 0],   // down
            [-1, 0],  // up
            [0, 1],   // right
            [0, -1]   // left
        ];
        const ROWS = grid.length; // Number of rows in the grid
        const COLS = grid[0].length; // Number of columns in the grid
        let islands = 0; // Counter for number of islands found
        const dfs = (r, c) => { // DFS to sink (mark as visited) the entire island
            if (r < 0 || c < 0 || r >= ROWS || c >= COLS || grid[r][c] === '0') 
                return; // base case: out of bounds or water cell, just return
            grid[r][c] = '0'; // Mark this land as visited by turning it into water
            for (const [dr, dc] of directions) { // Visit all 4 adjacent cells
                dfs(r + dr, c + dc);
            }
        };
        for (let r = 0; r < ROWS; r++) { // Iterate through every cell in the grid
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c] === '1') { // If we find land, we need to sink the entire island
                    dfs(r, c);  // In this DFS call, the island will be marked as visited recursively
                    islands++;  // So in this line, we can safely increment our island count by 1
                }
            }
        }
        return islands; // Finally, return the total number of islands found
    }
}

// Test Cases
const solution = new Solution();

const grid1 = [
  ["1","1","1","1","0"],
  ["1","1","0","1","0"],
  ["1","1","0","0","0"],
  ["0","0","0","0","0"]
];
console.log(solution.numIslands(grid1));  // 1

console.log("");

const grid2 = [
  ["1","1","1","0","0"],
  ["1","1","0","0","0"],
  ["1","0","1","0","0"],
  ["0","0","0","1","1"]
];
console.log(solution.numIslands(grid2));  // 3

console.log("");

const grid3 = [
  ["1","0","1","1","0"],
  ["1","0","0","1","0"],
  ["0","1","0","0","1"]
];
console.log(solution.numIslands(grid3));  // 4

console.log("");

const grid4 = [["1"]]; 
console.log(solution.numIslands(grid4));  // 1

console.log("");

const grid5 = [["0"]]; 
console.log(solution.numIslands(grid5));  // 0

console.log("");

const grid6 = [
  ["1","1","1"],
  ["0","1","0"],
  ["1","1","1"]
];
console.log(solution.numIslands(grid6));  // 1
}