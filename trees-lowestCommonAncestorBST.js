// lowestCommonAncestorBST.js
export default function run() {

/*

Lowest Common Ancestor of a Binary Search Tree (LCA in BST)

Given a binary search tree (BST), find the lowest common ancestor (LCA) of two given nodes in the BST.

According to the definition of LCA on LeetCode:
"The lowest common ancestor is defined between two nodes p and q as the lowest node in T that has both p and q as descendants (where we allow a node to be a descendant of itself)."

Note: This solution takes advantage of the BST property (left < node < right).

Example:
Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8
Output: 6

Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4
Output: 2

Time Complexity : O(H)     [H = height of the tree. Best O(log N), worst O(N)]
Space Complexity: O(1)     [Iterative approach - no recursion stack]

This is the most optimized iterative solution using BST properties (NeetCode standard).

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
     * @param {TreeNode} p
     * @param {TreeNode} q
     * @return {TreeNode}
     */

    lowestCommonAncestor(root, p, q) {
        let cur = root;
        while (cur) {
            // Category: Binary Search Tree + Iterative Traversal
            // Both p and q are in the right subtree
            if (p.val > cur.val && q.val > cur.val) {
                cur = cur.right;
            }
            // Both p and q are in the left subtree
            else if (p.val < cur.val && q.val < cur.val) {
                cur = cur.left;
            }
            // Current node is the LCA:
            // One node is on left, one on right, OR current node is p or q
            else {
                return cur;
            }
        }
        // Should not reach here if p and q exist in the tree
        return null;
    }

}

// ==================== TEST CASES ====================

const solution = new Solution();

// Helper: Build BST from level-order array
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

// Helper: Find node by value in the tree
function findNode(root, val) {
    if (!root) return null;
    if (root.val === val) return root;
    if (val < root.val) return findNode(root.left, val);
    return findNode(root.right, val);
}

// Test Case 1: LCA is root

const tree1 = buildTree([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5]);
const p1 = findNode(tree1, 2);
const q1 = findNode(tree1, 9);
console.log("Test 1:", solution.lowestCommonAncestor(tree1, p1, q1).val); // Expected: 6

console.log("");

// Test Case 2: LCA is one of the nodes (p is ancestor of q)
const p2 = findNode(tree1, 2);
const q2 = findNode(tree1, 4);
console.log("Test 2:", solution.lowestCommonAncestor(tree1, p2, q2).val);
// Expected: 2

// Test Case 3: Both nodes in left subtree
const p3 = findNode(tree1, 0);
const q3 = findNode(tree1, 4);
console.log("Test 3:", solution.lowestCommonAncestor(tree1, p3, q3).val);
// Expected: 2

// Test Case 4: Both nodes in right subtree
const p4 = findNode(tree1, 7);
const q4 = findNode(tree1, 9);
console.log("Test 4:", solution.lowestCommonAncestor(tree1, p4, q4).val);
// Expected: 8

// Test Case 5: Single node tree (p and q are same)
const tree5 = buildTree([1]);
const p5 = findNode(tree5, 1);
console.log("Test 5:", solution.lowestCommonAncestor(tree5, p5, p5).val);
// Expected: 1

// Test Case 6: Skewed tree
const tree6 = buildTree([5, 3, null, 2, null, 1]);
const p6 = findNode(tree6, 2);
const q6 = findNode(tree6, 1);
console.log("Test 6:", solution.lowestCommonAncestor(tree6, p6, q6).val);
// Expected: 2

/*

Start from the root:
- If both p and q are greater than current node → LCA must be in the right subtree → go right
- If both p and q are smaller than current node → LCA must be in the left subtree → go left
- Otherwise (one is on left, one on right, or current is p or q) → current node is the LCA


*/

}