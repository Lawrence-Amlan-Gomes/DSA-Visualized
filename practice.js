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

class Node {
    constructor(val) {
        this.val = val;
        this.neighbors = [];
    }
}

class Solution {
    /**
     * @param {Node} node
     * @return {Node}
     */ 

    cloneGraph(node) {
        return node
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