// graph-redundantConnection.js
export default function run() {
  /*
You're given a graph that started as a tree with n nodes labeled 1 to n, and had
exactly one extra edge added — creating exactly one cycle. edges is a list of n
[a, b] pairs, one per line of the original input, where a and b are node labels.

Find the edge that can be removed so the graph becomes a valid tree again (n nodes,
n - 1 edges, no cycle). If more than one edge would work, return the one that
occurs LAST in the input.

Example 1:
Input: edges = [[1,2],[1,3],[2,3]]
Output: [2,3]

Example 2:
Input: edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]
Output: [1,4]

Time Complexity : ?
Space Complexity: ?
*/

  class Solution {
    /**
     * @param {number[][]} edges
     * @return {number[]}
     */
    findRedundantConnection(edges) {
      // const n = edges.length;
      // const adj = Array.from({ length: n + 1 }, () => []);

      // function isConnected(start, target) {
      //   const visited = new Set([start]);
      //   const stack = [start];
      //   while (stack.length) {
      //     const node = stack.pop();
      //     if (node === target) return true;
      //     for (const next of adj[node]) {
      //       if (!visited.has(next)) {
      //         visited.add(next);
      //         stack.push(next);
      //       }
      //     }
      //   }
      //   return false;
      // }

      // for (const [u, v] of edges) {
      //   if (isConnected(u, v)) return [u, v];
      //   adj[u].push(v);
      //   adj[v].push(u);
      // }
      // return [];
      // Time: O(n²) — n edges, and each can trigger a DFS that visits up to O(n) nodes. Space: O(n) for the adjacency list and DFS stack.

      const n = edges.length;
      const parent = Array.from({ length: n + 1 }, (_, i) => i);
      const rank = new Array(n + 1).fill(1);

      function find(x) {
        while (parent[x] !== x) {
          parent[x] = parent[parent[x]]; // path compression
          x = parent[x];
        }
        return x;
      }

      function union(x, y) {
        const rootX = find(x),
          rootY = find(y);
        if (rootX === rootY) return false; // already connected -> cycle
        if (rank[rootX] < rank[rootY]) {
          parent[rootX] = rootY;
          rank[rootY] += rank[rootX];
        } else {
          parent[rootY] = rootX;
          rank[rootX] += rank[rootY];
        }
        return true;
      }

      for (const [u, v] of edges) {
        if (!union(u, v)) return [u, v];
      }
      return [];

      // Time: O(n·α(n)) ≈ O(n) — union/find with path compression and union by rank runs in amortized inverse-Ackermann time per call, essentially constant. Space: O(n) for the parent and rank arrays.
    }
  }

  // Test Cases
  const solution = new Solution();

  console.log(
    JSON.stringify(
      solution.findRedundantConnection([
        [1, 2],
        [1, 3],
        [2, 3],
      ]),
    ),
  );
  // Expected: [2,3]

  console.log("");

  console.log(
    JSON.stringify(
      solution.findRedundantConnection([
        [1, 2],
        [2, 3],
        [3, 4],
        [1, 4],
        [1, 5],
      ]),
    ),
  );
  // Expected: [1,4]

  console.log("");

  console.log(
    JSON.stringify(
      solution.findRedundantConnection([
        [1, 2],
        [2, 3],
        [3, 1],
      ]),
    ),
  );
  // Expected: [3,1]

  console.log("");

  console.log(
    JSON.stringify(
      solution.findRedundantConnection([
        [1, 4],
        [3, 4],
        [1, 3],
        [1, 2],
      ]),
    ),
  );
  // Expected: [1,3]
}
