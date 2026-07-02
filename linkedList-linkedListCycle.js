// linkedListCycle.js
export default function run() {
/*
Linked List Cycle

Given head, the head of a linked list, determine if the linked list has a cycle in it.

There is a cycle in a linked list if some node in the list can be reached again by continuously following the next pointer. Internally, pos is used to denote the index of the node that tail's next pointer is connected to. Note that pos is not passed as a parameter.

Return true if there is a cycle in the linked list. Otherwise, return false.

Example 1:
Input: head = [3,2,0,-4], pos = 1
Output: true
Explanation: There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed).

Example 2:
Input: head = [1,2], pos = 0
Output: true
Explanation: There is a cycle in the linked list, where the tail connects to the 0th node.

Example 3:
Input: head = [1], pos = -1
Output: false
Explanation: There is no cycle in the linked list.

Time Complexity : O(N)     [each node visited at most twice]
Space Complexity: O(1)     [only two pointers used - Floyd's Cycle Detection]

This is the optimal Floyd's Tortoise and Hare (slow & fast pointer) solution (NeetCode standard).
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
     * @return {boolean}
     */

    hasCycle(head) {
        // Category: Linked List + Two Pointers: Floyd's Cycle-Finding Algorithm
        let slow = head;   // Tortoise - moves 1 step
        let fast = head;   // Hare - moves 2 steps
        while (fast !== null && fast.next !== null) { // Loop until fast reaches the end of the list
            fast = fast.next.next; // Move fast two steps
            slow = slow.next; // Move slow one step
            if (fast === slow) { /* If there is a cycle they will definitely meet, because the 
                fast pointer is incrementing one extra step in each iteration than the slow pointer*/
                return true;
            }
        }
        return false; // If we reach here, fast reached the end → no cycle
    }

}

// Helper function to create a linked list from array with optional cycle
function createLinkedListWithCycle(arr, pos) {
    if (arr.length === 0) return null;

    const nodes = [];
    let head = new ListNode(arr[0]);
    nodes.push(head);
    let current = head;

    for (let i = 1; i < arr.length; i++) {
        current.next = new ListNode(arr[i]);
        current = current.next;
        nodes.push(current);
    }

    // Create cycle if pos is valid
    if (pos >= 0 && pos < nodes.length) {
        current.next = nodes[pos];
    }

    return head;
}

// Helper to detect cycle (for verification, not used in solution)
function hasCycleVerification(head) {
    const seen = new Set();
    let curr = head;
    while (curr) {
        if (seen.has(curr)) return true;
        seen.add(curr);
        curr = curr.next;
    }
    return false;
}

// Test Cases
const solution = new Solution();

console.log("=== Linked List Cycle Detection Tests ===");

// Test 1: Cycle exists (pos = 1)
let list1 = createLinkedListWithCycle([3, 2, 0, -4], 1);
console.log(solution.hasCycle(list1));
// Expected: true

// Test 2: Cycle exists (pos = 0)
let list2 = createLinkedListWithCycle([1, 2], 0);
console.log(solution.hasCycle(list2));
// Expected: true

// Test 3: No cycle
let list3 = createLinkedListWithCycle([1], -1);
console.log(solution.hasCycle(list3));
// Expected: false

// Test 4: Longer list with cycle at the end
let list4 = createLinkedListWithCycle([1, 2, 3, 4, 5, 6], 3);
console.log(solution.hasCycle(list4));
// Expected: true

// Test 5: Single node with self-loop
let list5 = createLinkedListWithCycle([1], 0);
console.log(solution.hasCycle(list5));
// Expected: true

// Test 6: Empty list
let list6 = createLinkedListWithCycle([], -1);
console.log(solution.hasCycle(list6));
// Expected: false

/*

- Slow pointer moves 1 step at a time.
- Fast pointer moves 2 steps at a time.

If there is a cycle, the fast pointer will eventually "lap" the slow pointer 
If there is no cycle, the fast pointer will reach the end (null) first.


*/

}