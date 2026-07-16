// cloneGraph.js
export default function run() {
  /*
Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.

Each node in the graph contains a value (int) and a list (List[Node]) of its neighbors.
The graph is represented as an adjacency list.

Note: The graph is connected and may contain cycles.

Example 1:

Input: adjList = [[2,4],[1,3],[2,4],[1,3]]
Output: [[2,4],[1,3],[2,4],[1,3]]

Example 2:
Input: adjList = [[]]
Output: [[]]

Example 3:
Input: adjList = []
Output: []

Time Complexity : ?
Space Complexity: ?

*/

  class Node {
    constructor(val, neighbors) {
      this.val = val === undefined ? 0 : val;
      this.neighbors = neighbors === undefined ? [] : neighbors;
    }
  }

  class Solution {
    /**
     * @param {Node} node
     * @return {Node}
     */

    cloneGraph(node) {
      const oldToNew = new Map();

      function dfs(node) {
        if (node === null) return null;
        if (oldToNew.has(node)) return oldToNew.get(node);

        const copy = new Node(node.val);
        oldToNew.set(node, copy);
        for (const nei of node.neighbors) {
          copy.neighbors.push(dfs(nei));
        }
        return copy;
      }

      return dfs(node);
      // Time: O(N + E) — every node is visited once, and every edge is crossed once from each of its two directions. Space: O(N) — the map holds one entry per node, plus O(N) recursion depth worst case.
    }
  }

  // ==================== TEST CASES ====================

  const solution = new Solution();

  // Helper to build a graph from an adjacency list (1-indexed neighbor values, LeetCode's format)
  function createGraph(adjList) {
    if (!adjList || adjList.length === 0) return null;

    const nodes = [];
    for (let i = 0; i < adjList.length; i++) {
      nodes[i] = new Node(i + 1);
    }
    for (let i = 0; i < adjList.length; i++) {
      for (const nei of adjList[i]) {
        nodes[i].neighbors.push(nodes[nei - 1]);
      }
    }
    return nodes[0];
  }

  // Helper to serialize a graph back into an adjacency list, sorted by node val, for structural
  // comparison against the original input — this catches a clone that's just the same reference
  // or one that's missing edges, which a plain "!== null" check would miss.
  function serializeGraph(node) {
    if (!node) return [];
    const visited = new Map();
    const order = [];
    (function dfs(n) {
      if (visited.has(n)) return;
      visited.set(n, true);
      order.push(n);
      for (const nei of n.neighbors) dfs(nei);
    })(node);
    order.sort((a, b) => a.val - b.val);
    return order.map((n) =>
      n.neighbors.map((nb) => nb.val).sort((a, b) => a - b),
    );
  }

  // Test 1 — connected graph with a cycle
  const graph1 = createGraph([
    [2, 4],
    [1, 3],
    [2, 4],
    [1, 3],
  ]);
  const cloned1 = solution.cloneGraph(graph1);
  console.log(JSON.stringify(serializeGraph(cloned1))); // Expected: [[2,4],[1,3],[2,4],[1,3]]
  console.log(cloned1 !== graph1); // Expected: true (must be a real copy, not the same reference)

  console.log("");

  // Test 2 — single node, no neighbors
  const graph2 = createGraph([[]]);
  const cloned2 = solution.cloneGraph(graph2);
  console.log(JSON.stringify(serializeGraph(cloned2))); // Expected: [[]]
  console.log(cloned2 !== graph2); // Expected: true

  console.log("");

  // Test 3 — empty graph
  const cloned3 = solution.cloneGraph(null);
  console.log(cloned3); // Expected: null

  console.log("");

  // Test 4 — single node with a self-loop
  const node = new Node(1);
  node.neighbors.push(node);
  const cloned4 = solution.cloneGraph(node);
  console.log(cloned4 !== node && cloned4.neighbors[0] === cloned4); // Expected: true (cloned self-loop points to the clone, not the original)
}
