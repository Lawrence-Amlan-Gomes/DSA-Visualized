// maximumDepthOfBinaryTree.js
export default function run() {
  /*

Maximum Depth of Binary Tree

Given the root of a binary tree, return its maximum depth.

The maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.

Example:
Input: root = [3,9,20,null,null,15,7]
       3
      / \
     9  20
       /  \
      15   7

Output: 3

Explanation: The longest path is 3 → 20 → 7 (or 3 → 20 → 15), which has 3 nodes.

Time Complexity :
Space Complexity:

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
     * @return {number}
     */

    maxDepth(root) {
      //   let depth = 0;
      //   let queue = [root];
      //   while (queue.length) {
      //     depth++;
      //     const next = [];
      //     for (const node of queue) {
      //       if (node.left) next.push(node.left);
      //       if (node.right) next.push(node.right);
      //     }
      //     queue = next;
      //   }
      //   return depth;
      // Time: O(n) — every node visited once. Space: O(n) worst case — a wide tree's queue can hold up to roughly n/2 nodes at its widest level.

      if (root === null) return 0;
      return 1 + Math.max(this.maxDepth(root.left), this.maxDepth(root.right));
      // Time: O(n) — every node visited once. Space: O(h) — the recursion call stack, where h is the tree's height.
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
  console.log("Test 1:", solution.maxDepth(tree1));
  // Expected: 3

  console.log("");

  // Test Case 2: Empty tree
  console.log("Test 2:", solution.maxDepth(null));
  // Expected: 0

  // Test Case 3: Single node
  const tree3 = buildTree([1]);
  console.log("Test 3:", solution.maxDepth(tree3));
  // Expected: 1

  // Test Case 4: Skewed left tree (linked list style)

  const tree4 = buildTree([1, 2, null, 3, null, 4]);
  console.log("Test 4:", solution.maxDepth(tree4)); // Expected: 4

  // Test Case 5: Skewed right tree
  const tree5 = buildTree([1, null, 2, null, 3, null, 4]);
  console.log("Test 5:", solution.maxDepth(tree5));
  // Expected: 4

  // Test Case 6: Balanced small tree
  const tree6 = buildTree([2, 1, 3]);
  console.log("Test 6:", solution.maxDepth(tree6));
  // Expected: 2

  // Test Case 7: Larger balanced tree
  const tree7 = buildTree([1, 2, 3, 4, 5, null, null, 6]);
  console.log("Test 7:", solution.maxDepth(tree7));
  // Expected: 4
}
