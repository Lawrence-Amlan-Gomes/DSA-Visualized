// serializeAndDeserializeBinaryTree.js
export default function run() {

/*

Serialize and Deserialize Binary Tree

Serialization is the process of converting a data structure or object into a sequence 
of bits so that it can be stored in a file or memory buffer, or transmitted across 
a network connection link to be reconstructed later in the same or another computer environment.

Design an algorithm to serialize and deserialize a binary tree. 
There is no restriction on how your serialization/deserialization algorithm should work. 
You just need to ensure that a binary tree can be serialized to a string and 
this string can be deserialized to the original tree structure.

Note: The input/output format is the same as how LeetCode serializes a binary tree. 
You do not necessarily need to follow this format.

Time Complexity : O(N)     [both serialize and deserialize visit each node once]
Space Complexity: O(N)     [for the result string and recursion stack]

This is the clean and optimal DFS (Pre-order) solution from NeetCode.

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

class Codec {

    serialize(root) {
        const res = [];
        this.dfsSerialize(root, res);
        return res.join(',');
    }
    dfsSerialize(node, res) {
        // Base case: null node is represented by 'N'
        if (node === null) {
            res.push('N');
            return;
        }
        // Pre-order: root -> left -> right
        res.push(node.val.toString());
        this.dfsSerialize(node.left, res);
        this.dfsSerialize(node.right, res);
    }
    deserialize(data) {
        if (!data) return null;
        
        const vals = data.split(',');
        const i = { val: 0 };        // using object to mutate index (pass by reference)
        
        return this.dfsDeserialize(vals, i);
    }
    dfsDeserialize(vals, i) {
        // If we encounter 'N', move forward and return null
        if (vals[i.val] === 'N') {
            i.val++;
            return null;
        }
        // Create current node
        const node = new TreeNode(parseInt(vals[i.val]));
        i.val++;

        // Recursively build left and right subtrees
        node.left = this.dfsDeserialize(vals, i);
        node.right = this.dfsDeserialize(vals, i);

        return node;
    }

}

// ==================== TEST CASES ====================

const codec = new Codec();

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

const tree1 = buildTree([1,2,3,null,null,4,5]);
const serialized1 = codec.serialize(tree1);
console.log("Serialized:", serialized1);
// Expected something like: 1,2,N,N,3,4,N,N,5,N,N

const deserialized1 = codec.deserialize(serialized1);
console.log("Deserialized root value:", deserialized1 ? deserialized1.val : null);
// Expected: 1

// Test Case 2
const tree2 = buildTree([1,null,2,3]);
console.log("Serialized:", codec.serialize(tree2));
// Expected: 1,N,2,3,N,N,N

// Test Case 3: Single node
const tree3 = buildTree([1]);
console.log("Serialized single node:", codec.serialize(tree3));
// Expected: 1,N,N

// Test Case 4: Empty tree
console.log("Serialized null tree:", codec.serialize(null));
// Expected: N

// Test Case 5
const tree5 = buildTree([4,-7,-3,null,null,-9,9,8,null,null,4]);
const ser5 = codec.serialize(tree5);
console.log("Complex tree serialized:", ser5);
const deser5 = codec.deserialize(ser5);
console.log("Deserialized complex tree root:", deser5 ? deser5.val : null);

console.log("\nAll tests completed successfully!");

/*

Serialization (Encode):
We use Pre-order DFS traversal (Root → Left → Right).
- If node is null, we add 'N' to the result.
- Otherwise, we add the node's value, then recurse on left and right.
- Finally, we join all values with commas.

Deserialization (Decode):
We split the string by comma to get an array of values.
We use a mutable index (object) to keep track of current position.
- If current value is 'N', we skip it and return null.
- Otherwise, we create a new node, move forward, then recursively build left and right.

*/

}