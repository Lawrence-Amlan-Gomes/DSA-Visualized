// sameBinaryTree.js
export default function run() {
  /*

Same Binary Tree (isSameTree)

Given the roots of two binary trees p and q, write a function to check if they are the same or not.

Two binary trees are the same if they are structurally identical, and the nodes have the same values.

Example:
Input: p = [1,2,3], q = [1,2,3]
Output: true

Input: p = [1,2], q = [1,null,2]
Output: false

Input: p = [1,2,1], q = [1,1,2]
Output: false

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
     * @param {TreeNode} p
     * @param {TreeNode} q
     * @return {boolean}
     */

    isSameTree(p, q) {
      //   function serialize(node, out) {
      //     if (!node) {
      //       out.push(null);
      //       return;
      //     }
      //     out.push(node.val);
      //     serialize(node.left, out);
      //     serialize(node.right, out);
      //   }

      //   const a = [],
      //     b = [];
      //   serialize(p, a);
      //   serialize(q, b);
      //   return a.length === b.length && a.every((v, i) => v === b[i]);
      // Time: O(n) — every node visited once during serialization, plus a linear comparison. Space: O(n) — two full extra arrays are built before any comparing happens, on top of the recursion stack.

      if (!p && !q) return true;
      if (!p || !q || p.val !== q.val) return false;
      return this.isSameTree(p.left, q.left) && this.isSameTree(p.right, q.right);

      // Time: O(n) — where n is the number of nodes in the smaller tree; the && can short-circuit and skip whole subtrees once a mismatch is found. Space: O(h) — just the recursion call stack, no extra arrays.
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

  // Test Case 1: Identical trees

  const p1 = buildTree([1, 2, 3]);
  const q1 = buildTree([1, 2, 3]);
  console.log("Test 1:", solution.isSameTree(p1, q1)); // Expected: true

  // Test Case 2: Different structure
  const p2 = buildTree([1, 2]);
  const q2 = buildTree([1, null, 2]);
  console.log("Test 2:", solution.isSameTree(p2, q2));
  // Expected: false

  // Test Case 3: Same structure, different values
  const p3 = buildTree([1, 2, 1]);
  const q3 = buildTree([1, 1, 2]);
  console.log("Test 3:", solution.isSameTree(p3, q3));
  // Expected: false

  // Test Case 4: Both empty trees
  console.log("Test 4:", solution.isSameTree(null, null));
  // Expected: true

  // Test Case 5: One empty, one not
  const p5 = buildTree([1]);
  console.log("Test 5:", solution.isSameTree(p5, null));
  // Expected: false

  // Test Case 6: Larger identical trees
  const p6 = buildTree([3, 9, 20, null, null, 15, 7]);
  const q6 = buildTree([3, 9, 20, null, null, 15, 7]);
  console.log("Test 6:", solution.isSameTree(p6, q6));
  // Expected: true

  // Test Case 7: Larger different trees
  const p7 = buildTree([1, 2, 3, 4, 5]);
  const q7 = buildTree([1, 2, 3, 4, 6]);
  console.log("Test 7:", solution.isSameTree(p7, q7));
  // Expected: false
}
