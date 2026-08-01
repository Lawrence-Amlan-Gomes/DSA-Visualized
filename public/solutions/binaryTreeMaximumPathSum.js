// binaryTreeMaximumPathSum.js

export default function run() {
  /*

Binary Tree Maximum Path Sum

A path in a binary tree is a sequence of nodes where each pair of adjacent nodes
in the path has an edge connecting them. A node can only appear in the sequence
at most once. Note that the path does not need to pass through the root.

The path sum of a path is the sum of the node's values in the path.

Given the root of a binary tree, return the maximum path sum of any non-empty path.

Example 1:
Input: root = [1,2,3]
Output: 6
Explanation: The optimal path is 2 -> 1 -> 3 with a path sum of 2 + 1 + 3 = 6.

Example 2:
Input: root = [-10,9,20,null,null,15,7]
Output: 42
Explanation: The optimal path is 15 -> 20 -> 7 with a path sum of 15 + 20 + 7 = 42.

Time Complexity : O(N)    [each node is visited exactly once]
Space Complexity: O(H)    [recursion stack, H = height of tree, best case O(log N), worst case O(N)]

*/

  class TreeNode {
    /**
     * @param {number} val
     * @param {TreeNode} left
     * @param {TreeNode} right
     */
    constructor(val = 0, left = null, right = null) {
      this.val = val;
      this.left = left;
      this.right = right;
    }
  }

  class Solution {
    maxPathSum(root) {
      //   function maxDownward(node) {
      //     if (!node) return 0;
      //     const left = Math.max(maxDownward(node.left), 0);
      //     const right = Math.max(maxDownward(node.right), 0);
      //     return node.val + Math.max(left, right);
      //   }
      //   let best = -Infinity;
      //   function visit(node) {
      //     if (!node) return;
      //     const left = Math.max(maxDownward(node.left), 0);
      //     const right = Math.max(maxDownward(node.right), 0);
      //     best = Math.max(best, node.val + left + right);
      //     visit(node.left);
      //     visit(node.right);
      //   }
      //   visit(root);
      //   return best;
      // Time: O(N²) worst case — every one of the N nodes triggers its own fresh O(N) downward recursion. Space: O(H) — recursion depth at any one moment, though total work is quadratic.

      if (!root) return 0;
      let best = -Infinity;
      function dfs(node) {
        if (!node) return 0;
        const left = Math.max(dfs(node.left), 0);
        const right = Math.max(dfs(node.right), 0);
        best = Math.max(best, node.val + left + right);
        return node.val + Math.max(left, right);
      }
      dfs(root);
      return best;
      // Time: O(N) — every node visited exactly once. Space: O(H) — just the recursion stack.
    }
  }

  // ==================== TEST CASES ====================

  const solution = new Solution();

  // Helper to build tree from array (level order)
  function buildTree(arr) {
    if (!arr || arr.length === 0) return null;

    const root = new TreeNode(arr[0]);
    const queue = [root];
    let i = 1;

    while (i < arr.length && queue.length > 0) {
      const node = queue.shift();

      if (i < arr.length && arr[i] !== null) {
        node.left = new TreeNode(arr[i]);
        queue.push(node.left);
      }
      i++;

      if (i < arr.length && arr[i] !== null) {
        node.right = new TreeNode(arr[i]);
        queue.push(node.right);
      }
      i++;
    }
    return root;
  }

  // Test Case 1
  console.log(solution.maxPathSum(buildTree([1, 2, 3])));
  // Expected: 6

  // Test Case 2
  console.log(solution.maxPathSum(buildTree([-10, 9, 20, null, null, 15, 7])));
  // Expected: 42

  // Test Case 3: Single node
  console.log(solution.maxPathSum(buildTree([1])));
  // Expected: 1

  // Test Case 4: All negative
  console.log(solution.maxPathSum(buildTree([-3])));
  // Expected: -3

  // Test Case 5: Negative root with positive children
  console.log(solution.maxPathSum(buildTree([-10, 9, 20])));
  // Expected: 20   (9 and 20 aren't adjacent — no edge between siblings — so the best valid path is node 20 alone)

  // Test Case 6: More complex tree
  console.log(solution.maxPathSum(buildTree([2, -1])));
  // Expected: 2

  // Test Case 7: Empty tree (edge case)
  console.log(solution.maxPathSum(null));
  // Expected: 0   (though problem assumes non-empty, we handle it safely)

  // Test Case 8
  console.log(solution.maxPathSum(buildTree([1, -2, 3])));
  // Expected: 4   (root -> right child: 1 + 3)

  // Test Case 9

  console.log(
    solution.maxPathSum(
      buildTree([5, 4, 8, 11, null, 13, 4, 7, 2, null, null, -6, 1]),
    ),
  );
  //                     5
  //                   /   \
  //                  4     8
  //                 /     / \
  //                11    13  4
  //               /  \      / \
  //              7    2   -6   1

  // Expected: 48   (7->11->4->5->8->13 or better path)

  console.log(solution.maxPathSum(buildTree([-1, -2, -3])));
  // Expected: -1
}
