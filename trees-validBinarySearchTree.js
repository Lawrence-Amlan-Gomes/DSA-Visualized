// validBinarySearchTree.js
export default function run() {

/*

Valid Binary Search Tree (isValidBST)

Given the root of a binary tree, determine if it is a valid binary search tree (BST).

A valid BST is defined as:
- The left subtree of a node contains only nodes with keys less than the node's key.
- The right subtree of a node contains only nodes with keys greater than the node's key.
- Both the left and right subtrees must also be valid binary search trees.

Example:
Input: root = [2,1,3]
Output: true

Input: root = [5,1,4,null,null,3,6]
Output: false
Explanation: The root node's value is 5 but its right child's right child is 3 which is less than 5.

Time Complexity : O(N)     [We visit every node exactly once]
Space Complexity: O(H)     [H = height of the tree due to recursion stack]

This is the cleanest and most optimized recursive solution using range bounds (NeetCode standard).

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
     * @return {boolean}
     */

    isValidBST(root) {
        return this.valid(root, -Infinity, Infinity);
    }
    valid(node, left, right) {
        // Category: Binary Search Tree + DFS with Range Constraints
        if (node === null) { // Base case: empty node is always valid
            return true;
        }

        // Current node value must be strictly within (left, right) range
        if (!(left < node.val && node.val < right)) {
            return false;
        }
        
        // Recursively validate left subtree: all values must be < current node
        // Recursively validate right subtree: all values must be > current node
        return (
            this.valid(node.left, left, node.val) &&
            this.valid(node.right, node.val, right)
        );
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

// Test Case 1: Valid BST (standard)
const tree1 = buildTree([2, 1, 3]);
console.log("Test 1:", solution.isValidBST(tree1));
// Expected: true

console.log("");

// Test Case 2: Invalid BST
const tree2 = buildTree([5, 1, 4, null, null, 3, 6]);
console.log("Test 2:", solution.isValidBST(tree2));
// Expected: false

// Test Case 3: Single node (always valid)
const tree3 = buildTree([1]);
console.log("Test 3:", solution.isValidBST(tree3));
// Expected: true

// Test Case 4: Empty tree (valid)
console.log("Test 4:", solution.isValidBST(null));
// Expected: true

// Test Case 5: Valid larger BST

const tree5 = buildTree([10, 5, 15, 3, 7, null, 20]);
console.log("Test 5:", solution.isValidBST(tree5)); // Expected: true

// Test Case 6: Invalid due to right subtree violation
const tree6 = buildTree([10, 5, 15, null, 20, 6, 25]);
console.log("Test 6:", solution.isValidBST(tree6));
// Expected: false

// Test Case 7: Valid skewed BST (left side)
const tree7 = buildTree([5, 3, null, 2, null, 1]);
console.log("Test 7:", solution.isValidBST(tree7));
// Expected: true

/*
Instead of checking BST properties by inorder traversal, we use a very efficient **range constraint** method.

For every node, we maintain a valid range [left, right] that its value must satisfy:
- Initially the whole tree has range (-∞, +∞)
- When going left, the upper bound becomes the current node's value
- When going right, the lower bound becomes the current node's value

At each node we check:
1. Is the current value strictly between left and right?
2. Are both left and right subtrees valid within their updated ranges?

This recursive approach elegantly enforces the BST rule at every level without needing extra space for tracking previous values.
It's clean, fast, and the most popular solution in interviews.
*/

}