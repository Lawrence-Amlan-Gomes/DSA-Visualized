// binaryTreeLevelOrderTraversal.js
export default function run() {

/*

Binary Tree Level Order Traversal

Given the root of a binary tree, return the level order traversal of its nodes' values. 
(i.e., from left to right, level by level).

Example:
Input: root = [3,9,20,null,null,15,7]
       3
      / \
     9  20
       /  \
      15   7

Output: [[3],[9,20],[15,7]]

Time Complexity : O(N)     [We visit every node exactly once]
Space Complexity: O(N)     [For the result array + queue in BFS, or recursion stack in DFS]

This is a clean recursive DFS solution that builds levels by depth (NeetCode style).

*/

class TreeNode {
    constructor(val = 0, left = null, right = null) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

class Solution {
    /**
     * @param {TreeNode} root
     * @return {number[][]}
     */

    levelOrder(root) {
        const res = [];
        function dfs(node, depth) {
            // Category: Binary Tree + DFS (Pre-order with depth tracking)
            if (!node) return; // base case: null node, just return
            if (res.length === depth) { // If the current depth doesn't have a level array yet
                res.push([]); // Create a new level array for this depth
            }
            res[depth].push(node.val); // Add current node value to its level's array
            dfs(node.left, depth + 1); // Passing the the left child and incrementing depth by 1
            dfs(node.right, depth + 1);// Passing the the right child and incrementing depth by 1
        }
        dfs(root, 0); // Call DFS starting from root at depth 0
        return res; // Return the final result array of levels
    }

}

// ==================== TEST CASES ====================

const solution = new Solution();

// Helper: Build tree from level-order array
function buildTree(arr) {
    if (!arr || arr.length === 0) return null;

    const root = new TreeNode(arr[0]);
    const queue = [root];
    let i = 1;

    while (i < arr.length) {
        const current = queue.shift();

        // Left child
        if (i < arr.length && arr[i] !== null) {
            current.left = new TreeNode(arr[i]);
            queue.push(current.left);
        }
        i++;

        // Right child
        if (i < arr.length && arr[i] !== null) {
            current.right = new TreeNode(arr[i]);
            queue.push(current.right);
        }
        i++;
    }
    return root;
}

// Test Case 1: Standard example
const tree1 = buildTree([3, 9, 20, null, null, 15, 7]);
console.log("Test 1:", solution.levelOrder(tree1));
// Expected: [[3],[9,20],[15,7]]

console.log("");

// Test Case 2: Empty tree
console.log("Test 2:", solution.levelOrder(null));
// Expected: []

// Test Case 3: Single node
const tree3 = buildTree([1]);
console.log("Test 3:", solution.levelOrder(tree3));
// Expected: [[1]]

// Test Case 4: Skewed left tree
const tree4 = buildTree([1, 2, null, 3, null, 4]);
console.log("Test 4:", solution.levelOrder(tree4));
// Expected: [[1],[2],[3],[4]]

// Test Case 5: Skewed right tree
const tree5 = buildTree([1, null, 2, null, 3, null, 4]);
console.log("Test 5:", solution.levelOrder(tree5));
// Expected: [[1],[2],[3],[4]]

// Test Case 6: Perfect binary tree (balanced)
const tree6 = buildTree([1, 2, 3, 4, 5, 6, 7]);
console.log("Test 6:", solution.levelOrder(tree6));
// Expected: [[1],[2,3],[4,5,6,7]]

// Test Case 7: Unbalanced tree

const tree7 = buildTree([1, 2, 3, 4, null, null, 5, null, null, null, 6]);
console.log("Test 7:", solution.levelOrder(tree7));
// Expected: [[1],[2,3],[4,5],[6]]

/*

We use DFS (Depth-First Search) with a depth tracker 
instead of the more common BFS queue approach.

For every node we visit:
1. If the current depth doesn't have a level array yet, we create one.
2. We add the node's value to the array at its depth index.
3. We recurse on the left child, then the right child (pre-order traversal).

Because we always process left before right and create levels in order, 
the result naturally comes out level by level from top to bottom, left to right.

*/

}