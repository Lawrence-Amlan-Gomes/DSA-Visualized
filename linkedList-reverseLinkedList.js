// reverseLinkedList.js
export default function run() {
  /*
Reverse Linked List

Given the head of a singly linked list, reverse the list, and return the reversed list.

Example:
Input: head = [1,2,3,4,5]
Output: [5,4,3,2,1]

Constraints:
- The number of nodes in the list is in the range [0, 5000].
- -5000 <= Node.val <= 5000

Time Complexity :
Space Complexity:
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
     * @return {ListNode}
     */

    reverseList(head) {
      //   const vals = [];
      //   let node = head;
      //   while (node) {
      //     vals.push(node.val);
      //     node = node.next;
      //   }
      //   vals.reverse();
      //   const dummy = new ListNode();
      //   let tail = dummy;
      //   for (const v of vals) {
      //     tail.next = new ListNode(v);
      //     tail = tail.next;
      //   }
      //   return dummy.next;
      // Time: O(n) — two passes over the list. Space: O(n) — the array plus a whole new set of nodes.

      let prev = null;
      let curr = head;
      while (curr !== null) {
        const temp = curr.next;
        curr.next = prev;
        prev = curr;
        curr = temp;
      }
      return prev;

      // Time: O(n) — one pass. Space: O(1) — just three pointers, no new nodes.
    }
  }

  // Helper function to create a linked list from array (for testing)
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

  // Helper function to convert linked list back to array for printing
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

  console.log("=== Reverse Linked List Tests ===");

  // Test 1: Normal case
  let list1 = createLinkedList([1, 2, 3, 4, 5]);
  console.log(linkedListToArray(solution.reverseList(list1)));
  // Expected: [5, 4, 3, 2, 1]

  list1 = createLinkedList([1, 2, 3, 4, 5]);
  console.log(linkedListToArray(solution.reverseList(list1)));
  // Expected: [5, 4, 3, 2, 1]

  // Test 2: Two nodes
  let list2 = createLinkedList([1, 2]);
  console.log(linkedListToArray(solution.reverseList(list2)));
  // Expected: [2, 1]

  // Test 3: Single node
  let list3 = createLinkedList([1]);
  console.log(linkedListToArray(solution.reverseList(list3)));
  // Expected: [1]

  // Test 4: Empty list
  let list4 = createLinkedList([]);
  console.log(linkedListToArray(solution.reverseList(list4)));
  // Expected: []

  // Test 5: Another example
  let list5 = createLinkedList([0, 1, 2]);
  console.log(linkedListToArray(solution.reverseList(list5)));
  // Expected: [2, 1, 0]
}
