// constructBinaryTreeFromPreorderAndInorderTraversal.js
export default function run() {
  /*

Construct Binary Tree from Preorder and Inorder Traversal

Given two integer arrays preorder and inorder where preorder is the preorder traversal of a binary tree
and inorder is the inorder traversal of the same tree, construct and return the binary tree.

Note: Both arrays have unique values and represent the same tree.

Example 1:
Input: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]
Output: [3,9,20,null,null,15,7]

       3
      / \
     9  20
       /  \
      15   7

Example 2:
Input: preorder = [1], inorder = [1]
Output: [1]

Time Complexity : O(N)     [N = number of nodes, with hashmap we do O(1) lookup]
Space Complexity: O(N)     [Hashmap + recursion stack]

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
     * @param {number[]} preorder
     * @param {number[]} inorder
     * @return {TreeNode}
     */

    buildTree(preorder, inorder) {
      //   if (!preorder.length) return null;
      //   const rootVal = preorder[0];
      //   const root = new TreeNode(rootVal);
      //   const mid = inorder.indexOf(rootVal);
      //   root.left = buildTree(preorder.slice(1, mid + 1), inorder.slice(0, mid));
      //   root.right = buildTree(preorder.slice(mid + 1), inorder.slice(mid + 1));
      //   return root;
      // Time: O(N²) — indexOf is O(N) per call, and slicing copies elements every level, across O(N) calls. Space: O(N²) worst case — every call allocates new sliced arrays (a fully skewed tree makes this add up fast).

      const inorderMap = new Map();
      inorder.forEach((v, i) => inorderMap.set(v, i));
      let preIndex = 0;
      function build(left, right) {
        if (left > right) return null;
        const rootVal = preorder[preIndex++];
        const root = new TreeNode(rootVal);
        const mid = inorderMap.get(rootVal);
        root.left = build(left, mid - 1);
        root.right = build(mid + 1, right);
        return root;
      }
      return build(0, inorder.length - 1);
      // Time: O(N) — every node created once, every lookup O(1). Space: O(N) — the hashmap, plus O(H) recursion stack.
    }
  }

  // ==================== TEST CASES ====================

  const solution = new Solution();

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

    // Remove trailing nulls for cleaner output
    while (result.length > 0 && result[result.length - 1] === null) {
      result.pop();
    }

    return result;
  }

  // Test Case 1: Standard example

  const preorder1 = [3, 9, 20, 15, 7];
  const inorder1 = [9, 3, 15, 20, 7];
  console.log("Test 1:", treeToArray(solution.buildTree(preorder1, inorder1)));
  // Expected: [3,9,20,null,null,15,7]

  console.log("");

  // Test Case 2: Single node
  const preorder2 = [1];
  const inorder2 = [1];
  console.log("Test 2:", treeToArray(solution.buildTree(preorder2, inorder2)));
  // Expected: [1]

  // Test Case 3: Left skewed tree
  const preorder3 = [1, 2, 3];
  const inorder3 = [3, 2, 1];
  console.log("Test 3:", treeToArray(solution.buildTree(preorder3, inorder3)));
  // Expected: [1,2,null,3]

  // Test Case 4: Right skewed tree
  const preorder4 = [1, 2, 3];
  const inorder4 = [1, 2, 3];
  console.log("Test 4:", treeToArray(solution.buildTree(preorder4, inorder4)));
  // Expected: [1,null,2,null,3]

  // Test Case 5: Balanced small tree
  const preorder5 = [2, 1, 3];
  const inorder5 = [1, 2, 3];
  console.log("Test 5:", treeToArray(solution.buildTree(preorder5, inorder5)));
  // Expected: [2,1,3]

  // Test Case 6: Larger example
  const preorder6 = [5, 3, 2, 4, 7, 6, 8];
  const inorder6 = [2, 3, 4, 5, 6, 7, 8];
  console.log("Test 6:", treeToArray(solution.buildTree(preorder6, inorder6)));
  // Expected: [5,3,7,2,4,6,8]
}
