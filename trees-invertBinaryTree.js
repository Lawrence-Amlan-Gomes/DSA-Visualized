// invertBinaryTree.js
export default function run() {

/*

Invert Binary Tree

Given the root of a binary tree, invert the tree, and return its root.

Inverting a binary tree means swapping the left and right children of every node.

Example:
Input: root = [4,2,7,1,3,6,9]
       4
     /   \
    2     7
   / \   / \
  1   3 6   9

Output: [4,7,2,9,6,3,1]
       4
     /   \
    7     2
   / \   / \
  9   6 3   1

Time Complexity : O(N)     [We visit every node exactly once]
Space Complexity: O(H)     [H = height of the tree, recursion stack. Worst case O(N) for skewed tree]

This is the cleanest recursive DFS solution (NeetCode standard).

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
     * @return {TreeNode}
     */

    invertTree(root) {
        if (!root) { // If the current node is null, just return null (base case)
            return null;
        }
        [root.left, root.right] = [root.right, root.left]; // Swap left and right children of current node
        this.invertTree(root.left);
        this.invertTree(root.right);
        /* Basically what happening here is: the current node's children are swapped, then each chid
        recursively goes in the function where the child's children will do the same thing */
        return root;
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

// Helper: Convert tree to level-order array for printing
function treeToArray(root) {
    if (!root) return [];

    const result = [];
    const queue = [root];

    while (queue.length > 0) {
        const node = queue.shift();
        if (node) {
            result.push(node.val);
            queue.push(node.left);
            queue.push(node.right);
        } else {
            result.push(null);
        }
    }

    // Remove trailing nulls
    while (result.length > 0 && result[result.length - 1] === null) {
        result.pop();
    }

    return result;
}

// Test Case 1: Standard example

const tree1 = buildTree([4, 2, 7, 1, 3, 6, 9]);
/*
           4
         /   \  
        2     7
       / \   / \
      1   3 6   9
*/
console.log("Test 1:", treeToArray(solution.invertTree(tree1))); // Expected: [4,7,2,9,6,3,1]

console.log("");

// Test Case 2: Empty tree
console.log("Test 2:", treeToArray(solution.invertTree(null)));
// Expected: []

// Test Case 3: Single node
const tree3 = buildTree([1]);
console.log("Test 3:", treeToArray(solution.invertTree(tree3)));
// Expected: [1]

// Test Case 4: Skewed left tree
const tree4 = buildTree([1, 2, null, 3]);
console.log("Test 4:", treeToArray(solution.invertTree(tree4)));
// Expected: [1,null,2,null,3]

// Test Case 5: Skewed right tree
const tree5 = buildTree([1, null, 2, null, 3]);
console.log("Test 5:", treeToArray(solution.invertTree(tree5)));
// Expected: [1,2,null,3,null]

// Test Case 6: Balanced small tree
const tree6 = buildTree([2, 1, 3]);
console.log("Test 6:", treeToArray(solution.invertTree(tree6)));
// Expected: [2,3,1]

/*

This is a classic recursive DFS approach.
For every node we visit:
1. Swap its left and right children immediately.
2. Recursively do the same for the (new) left subtree.
3. Recursively do the same for the (new) right subtree.
Because we swap first and then recurse, the entire tree gets inverted bottom-up naturally.

*/

}