// kthSmallestIntegerInBST.js
export default function run() {
  /*

Kth Smallest Integer in a BST (kthSmallest)

Given the root of a binary search tree, and an integer k, return the kth smallest value (1-indexed)
of all the values of the nodes in the tree.

Example:
Input: root = [3,1,4,null,2], k = 1
Output: 1

Input: root = [5,3,6,2,4,null,null,1], k = 3
Output: 3

Time Complexity : O(H + K)     [H = height of tree. In balanced BST ≈ O(log N + K)]
Space Complexity: O(H)         [Recursion stack]

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
     * @param {number} k
     * @return {number}
     */

    kthSmallest(root, k) {
      //   const values = [];
      //   function inorder(node) {
      //     if (!node) return;
      //     inorder(node.left);
      //     values.push(node.val);
      //     inorder(node.right);
      //   }
      //   inorder(root);
      //   return values[k - 1];
      // Time: O(N) — visits every node, even if k is small and the answer shows up early. Space: O(N) — the values array holds every node's value, on top of the O(H) recursion stack.

      const stack = [];
      let node = root;
      while (node || stack.length) {
        while (node) {
          stack.push(node);
          node = node.left;
        }
        node = stack.pop();
        k--;
        if (k === 0) return node.val;
        node = node.right;
      }
      // Time: O(H + K) — walk down to the leftmost node once (O(H)), then only pop/advance K times. Space: O(H) — the stack only ever holds one root-to-node path.
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

  // Test Case 1: Standard example - k=1
  const tree1 = buildTree([3, 1, 4, null, 2]);
  console.log("Test 1 (k=1):", solution.kthSmallest(tree1, 1));
  // Expected: 1

  console.log("");

  // Test Case 2: Standard example - k=3
  const tree2 = buildTree([5, 3, 6, 2, 4, null, null, 1]);
  console.log("Test 2 (k=3):", solution.kthSmallest(tree2, 3));
  // Expected: 3

  // Test Case 3: k = 1 (smallest element)
  console.log("Test 3 (k=1):", solution.kthSmallest(tree2, 1));
  // Expected: 1

  // Test Case 4: k = last element (largest)
  console.log("Test 4 (k=6):", solution.kthSmallest(tree2, 6));
  // Expected: 6  (values in order: 1,2,3,4,5,6)

  // Test Case 5: Single node
  const tree5 = buildTree([10]);
  console.log("Test 5 (k=1):", solution.kthSmallest(tree5, 1));
  // Expected: 10

  // Test Case 6: Skewed left BST
  const tree6 = buildTree([5, 4, null, 3, null, 2, null, 1]);
  console.log("Test 6 (k=3):", solution.kthSmallest(tree6, 3));
  // Expected: 3

  // Test Case 7: Balanced BST

  const tree7 = buildTree([8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13]);
  console.log("Test 7 (k=5):", solution.kthSmallest(tree7, 5));
  // Expected: 7   (inorder: 1,3,4,6,7,8,10,13,14)
}
