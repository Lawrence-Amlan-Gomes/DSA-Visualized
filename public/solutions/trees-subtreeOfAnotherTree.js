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
     * @param {TreeNode} subRoot
     * @return {boolean}
     */

    isSubtree(root, subRoot) {
      function sameTree(a, b) {
        if (!a && !b) return true;
        if (!a || !b || a.val !== b.val) return false;
        return sameTree(a.left, b.left) && sameTree(a.right, b.right);
      }

      if (!subRoot) return true;
      if (!root) return false;
      if (sameTree(root, subRoot)) return true;
      return this.isSubtree(root.left, subRoot) || this.isSubtree(root.right, subRoot);

      // Time: O(M · N) — M = nodes in root, N = nodes in subRoot; in the worst case you attempt the sameTree check at every one of root's M nodes, and each check can walk up to N nodes deep before failing. Space: O(H) — the recursion stack, H = root's height.
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
}
