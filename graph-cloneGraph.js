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

Time Complexity : O(N + E)   [N = number of nodes, E = number of edges]
Space Complexity: O(N)       [for the hash map + recursion stack]

*/

class Solution {
    /**
     * @param {Node} node
     * @return {Node}
     */ 

    cloneGraph(node) {
        const oldToNew = new Map();   // Maps old nodes → new cloned nodes
        return this.dfs(node, oldToNew); // The main function that initiates the DFS cloning process
    }
    dfs(node, oldToNew) { // DFS helper function to clone the graph
        // Category: Graph + DFS with Hash Map for Cloning
        if (node === null) { // Base case: if the input node is null, just return null
            return null; 
        }
        if (oldToNew.has(node)) { // If this node has already been cloned
            return oldToNew.get(node); // Return the cloned node from the map
        }
        const copy = new Node(node.val); // Create a new node with the same value as the original node
        oldToNew.set(node, copy); // Add in the map: original node → cloned node
        for (const nei of node.neighbors) { // Iterate through each neighbor of the original node
            const clonedNeighbor = this.dfs(nei, oldToNew); // Recursively clone the neighbor
            copy.neighbors.push(clonedNeighbor); /* Add the cloned neighbor to the neighbors list 
                                                    of the cloned node */
        }
        return copy; // Return the fully cloned node with all its neighbors cloned as well
    }
}

// ==================== TEST CASES ====================

const solution = new Solution();

// Helper to create graph for testing
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

// Test 1
console.log("Test 1:");
const graph1 = createGraph([[2,4],[1,3],[2,4],[1,3]]);
const cloned1 = solution.cloneGraph(graph1);
console.log("Cloned successfully:", cloned1 !== null);

// Test 2
console.log("\nTest 2:");
const graph2 = createGraph([[]]);
const cloned2 = solution.cloneGraph(graph2);
console.log("Cloned successfully:", cloned2 !== null && cloned2.neighbors.length === 0);

// Test 3 - Empty graph
console.log("\nTest 3:");
const cloned3 = solution.cloneGraph(null);
console.log("Null input:", cloned3 === null);

// Test 4 - Single node with cycle
console.log("\nTest 4:");
const node = new Node(1);
node.neighbors.push(node);           // self-loop
const cloned4 = solution.cloneGraph(node);
console.log("Self-loop cloned successfully:", cloned4 !== null && cloned4.neighbors[0] === cloned4);
}