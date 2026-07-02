// removeNthFromEnd.js
export default function run() {
/*
Remove Nth Node From End of List

Given the head of a linked list, remove the nth node from the end of the list and return its head.

Example:
Input: head = [1,2,3,4,5], n = 2
Output: [1,2,3,5]

Constraints:
- The number of nodes in the list is sz.
- 1 <= sz <= 30
- 1 <= n <= sz

Time Complexity : O(N)     [single pass with two pointers]
Space Complexity: O(1)     [constant extra space, dummy node]

This is the optimal two-pointer (fast & slow) solution — standard NeetCode / LeetCode approach.
*/

class ListNode {
    /**
     * @param {number} val
     * @param {ListNode|null} next
     */
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

class Solution {
    /**
     * @param {ListNode} head
     * @param {number} n
     * @return {ListNode}
     */

    removeNthFromEnd(head, n) {
        // Category: Linked List + Two Pointers (High Frequency)
        const dummy = new ListNode(0, head);// Create a dummy node that points to the head of the list. 
        let left = dummy;  // slow pointer (will end up just before the node to remove)
        let right = head;  // fast pointer (will be n nodes ahead from left pointer)
        while (n > 0) { // In this loop, we move the right pointer n steps ahead from the left pointer
            right = right.next;
            n--;
        }
        while (right !== null) { /* Until the right pointer reaches the end of the list, both pointers
             move one step at a time. the left node will stop just before the node to remove */
            left = left.next;   
            right = right.next;
        }
        left.next = left.next.next; // now we simple skip the target node by jumping over it
        return dummy.next; // the node after dummy our head
    }

}

// ==================== TEST CASES ====================

const solution = new Solution();

// Helper to create linked list from array
function createList(arr) {
    if (!arr || arr.length === 0) return null;
    let head = new ListNode(arr[0]);
    let current = head;
    for (let i = 1; i < arr.length; i++) {
        current.next = new ListNode(arr[i]);
        current = current.next;
    }
    return head;
}

// Helper to convert linked list to array for easy printing
function listToArray(head) {
    const result = [];
    let current = head;
    while (current !== null) {
        result.push(current.val);
        current = current.next;
    }
    return result;
}

// Test 1: Standard case

let head1 = createList([1, 2, 3, 4, 5]);
let result1 = solution.removeNthFromEnd(head1, 2);
console.log("Test 1:", listToArray(result1));     // Expected: [1,2,3,5]

// Test 2: Remove first node (head)
let head2 = createList([1]);
let result2 = solution.removeNthFromEnd(head2, 1);
console.log("Test 2:", listToArray(result2));     // Expected: []

// Test 3: Remove last node
let head3 = createList([1, 2]);
let result3 = solution.removeNthFromEnd(head3, 1);
console.log("Test 3:", listToArray(result3));     // Expected: [1]

// Test 4: Remove head when list has multiple nodes
let head4 = createList([1, 2, 3]);
let result4 = solution.removeNthFromEnd(head4, 3);
console.log("Test 4:", listToArray(result4));     // Expected: [2,3]

// Test 5: n = 1 (remove last node)
let head5 = createList([1, 2, 3, 4, 5]);
let result5 = solution.removeNthFromEnd(head5, 1);
console.log("Test 5:", listToArray(result5));     // Expected: [1,2,3,4]

/*

We use the "two-pointer gap" technique.
1. We put a dummy node at the front so we can safely remove the head if needed.
2. We move the fast pointer (right) n steps ahead. Now the distance between 
   left and right is exactly n.
3. We move both pointers together until the fast pointer reaches the end.
   When fast reaches null, slow (left) is exactly at the node BEFORE the one we want to remove.
4. We simply skip the target node by doing: left.next = left.next.next


*/

}