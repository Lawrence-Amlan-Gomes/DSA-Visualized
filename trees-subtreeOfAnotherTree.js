// subtreeOfAnotherTree.js
export default function run() {

/*

Subtree of Another Tree (isSubtree)

Given the roots of two binary trees root and subRoot, return true if there is a subtree of root with the same structure and node values of subRoot and false otherwise.

A subtree of a binary tree tree is a tree that consists of a node in tree and all of this node's descendants. The tree tree could also be considered as a subtree of itself.

Example:
Input: root = [3,4,5,1,2], subRoot = [4,1,2]
Output: true

Input: root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]
Output: false

Time Complexity : O(M * N)   [M = nodes in root, N = nodes in subRoot]
Space Complexity: O(H)       [Recursion stack, H = height of root tree, 
                              worst case O(M), best case O(log M) for balanced tree]

This is the standard optimized recursive solution using "sameTree" helper (NeetCode style).

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
     * @param {TreeNode} subRoot
     * @return {boolean}
     */

    isSubtree(root, subRoot) {
        // If subRoot is null, it's always a subtree (vacuously true)
        if (!subRoot) {
            return true;
        }
        // If root is null but subRoot is not, cannot be a subtree
        if (!root) {
            return false;
        }
        // Check if current root matches subRoot exactly
        if (this.sameTree(root, subRoot)) { 
            // sameTree is basically the "Same Binary Tree" solution we did before
            return true;
        }
        // Otherwise, check if subRoot exists in left or right subtree
        return (
            this.isSubtree(root.left, subRoot) ||
            this.isSubtree(root.right, subRoot)
        );
    }

    /**
     * Helper: Check if two trees are identical (same structure and values)
     * @param {TreeNode} root
     * @param {TreeNode} subRoot
     * @return {boolean}
     */

    sameTree(root, subRoot) {
        // Both empty → same
        if (!root && !subRoot) {
            return true;
        }
        // One empty or values differ → not same
        if (!root || !subRoot || root.val !== subRoot.val) {
            return false;
        }
        // Both subtrees must also be the same
        return (
            this.sameTree(root.left, subRoot.left) &&
            this.sameTree(root.right, subRoot.right)
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

// Test Case 1: Standard true case
const root1 = buildTree([3, 4, 5, 1, 2]);
const sub1 = buildTree([4, 1, 2]);
console.log("Test 1:", solution.isSubtree(root1, sub1));
// Expected: true

console.log("");

// Test Case 2: Standard false case (extra node)
const root2 = buildTree([3, 4, 5, 1, 2, null, null, null, null, 0]);
const sub2 = buildTree([4, 1, 2]);
console.log("Test 2:", solution.isSubtree(root2, sub2));
// Expected: false

// Test Case 3: Subtree is the entire tree
const root3 = buildTree([1, 2, 3]);
const sub3 = buildTree([1, 2, 3]);
console.log("Test 3:", solution.isSubtree(root3, sub3));
// Expected: true

// Test Case 4: Empty subRoot
console.log("Test 4:", solution.isSubtree(buildTree([1, 2, 3]), null));
// Expected: true

// Test Case 5: Empty root, non-empty subRoot
console.log("Test 5:", solution.isSubtree(null, buildTree([1])));
// Expected: false

// Test Case 6: Single node subtree
const root6 = buildTree([3, 4, 5]);
const sub6 = buildTree([4]);
console.log("Test 6:", solution.isSubtree(root6, sub6));
// Expected: true

// Test Case 7: Deeper subtree

const root7 = buildTree([1, 2, 3, 4, 5, 6, 7]);
const sub7 = buildTree([2, 4, 5]);
console.log("Test 7:", solution.isSubtree(root7, sub7)); // Expected: true

/*
Easy explanation:

We solve this by combining two ideas:

1. **sameTree helper** → Checks if two trees are completely identical (same values + same structure). 
   This is almost the same as the "Same Binary Tree" problem we solved earlier.

2. **isSubtree main function** → For every node in the main tree (root), we check:
   - If the tree starting at this node is exactly the same as subRoot → return true
   - Otherwise, recursively search in the left subtree OR right subtree

The recursion stops when:
- We find a matching subtree → return true
- We exhaust the entire main tree without finding a match → return false

This approach is clean, intuitive, and the standard solution expected in interviews.
Time complexity is acceptable for most interview constraints.
*/

}