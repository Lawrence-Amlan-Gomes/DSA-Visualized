// reorderLinkedList.js
export default function run() {
/*
Reorder List

You are given the head of a singly linked list. The list can be represented as:

L0 → L1 → … → Ln-1 → Ln

Reorder the list to be in the following form:

L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → …

You may not modify the values in the list's nodes. Only nodes themselves may be changed.

Example 1:
Input: head = [1,2,3,4]
Output: [1,4,2,3]

Example 2:
Input: head = [1,2,3,4,5]
Output: [1,5,2,4,3]

Constraints:
- The number of nodes in the list is in the range [1, 5 * 10^4].
- 1 <= Node.val <= 1000

Time Complexity : O(N)
Space Complexity: O(1)

This is the optimal in-place solution using three steps (NeetCode standard).
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
     * @return {void}
     */

    reorderList(head) {
        // Category: Linked List (High Frequency - Medium/Hard)
        if (!head || !head.next) return;
        let slow = head;
        let fast = head.next;   // fast starts one ahead to get proper middle
        while (fast !== null && fast.next !== null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        let second = slow.next;
        let prev = (slow.next = null);   // Break the list into two halves
        while (second !== null) {
            const tmp = second.next;
            second.next = prev;
            prev = second;
            second = tmp;
        }
        let first = head;
        second = prev;   // prev is now the head of reversed second half
        while (second !== null) {
            const tmp1 = first.next;
            const tmp2 = second.next;
            first.next = second;     // Link from first half
            second.next = tmp1;      // Link from second half
            first = tmp1;
            second = tmp2;
        }
    }

}




// Helper function to create a linked list from array
function createLinkedList(arr) {
    if (arr.length === 0) return null;
    let head = new ListNode(arr[0]);
    let current = head;
    for (let i = 1; i < arr.length; i++) {
        current.next = new ListNode(arr[i]);
        current = current.next;
    }
    return head;
}

// Helper function to convert linked list to array for printing
function linkedListToArray(head) {
    const result = [];
    let current = head;
    while (current !== null) {
        result.push(current.val);
        current = current.next;
    }
    return result;
}

// Test Cases
const solution = new Solution();

console.log("=== Reorder Linked List Tests ===");

// Test 1: Even length
let list1 = createLinkedList([1, 2, 3, 4]);
solution.reorderList(list1);
console.log(linkedListToArray(list1));
// Expected: [1,4,2,3]

list1 = createLinkedList([1, 2, 3, 4]);
solution.reorderList(list1);
console.log(linkedListToArray(list1));
// Expected: [1,4,2,3]

// Test 2: Odd length

let list2 = createLinkedList([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
solution.reorderList(list2);
console.log(linkedListToArray(list2));
// Expected: [1,10,2,9,3,8,4,7,5,6]

// Test 3: Small list (2 nodes)
let list3 = createLinkedList([1, 2]);
solution.reorderList(list3);
console.log(linkedListToArray(list3));
// Expected: [1,2]

// Test 4: Single node
let list4 = createLinkedList([1]);
solution.reorderList(list4);
console.log(linkedListToArray(list4));
// Expected: [1]

// Test 5: Longer list
let list5 = createLinkedList([1, 2, 3, 4, 5, 6, 7]);
solution.reorderList(list5);
console.log(linkedListToArray(list5));
// Expected: [1,7,2,6,3,5,4]

/*

1. Find Middle: Use slow and fast pointers to find the middle of the list.
   - After this, slow points to the last node of the first half.
2. Reverse Second Half: Reverse the list starting from slow.next.
   - We break the connection between the two halves by setting slow.next = null.
3. Merge Alternately: Merge the first half and the reversed second half by
   alternately picking one node from each.

*/

}