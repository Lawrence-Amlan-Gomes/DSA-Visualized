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
     * @param {number} n
     * @return {ListNode}
     */

    removeNthFromEnd(head, n) {
      //   let length = 0;
      //   for (let node = head; node; node = node.next) length++;
      //   const dummy = new ListNode(0, head);
      //   let curr = dummy;
      //   for (let i = 0; i < length - n; i++) curr = curr.next;
      //   curr.next = curr.next.next;
      //   return dummy.next;
      // Time: O(n) — still linear, but it's two full passes over the list instead of one. Space: O(1). Not a worse Big-O than the optimal version — just less elegant, and it needs the length known before the second pass can even start.

      const dummy = new ListNode(0, head);
      let left = dummy;
      let right = head;
      while (n > 0) {
        right = right.next;
        n--;
      }
      while (right !== null) {
        left = left.next;
        right = right.next;
      }
      left.next = left.next.next;
      return dummy.next;
      // Time: O(n) — one pass, right pointer touches each node once. Space: O(1) — two pointers plus the dummy.
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
  console.log("Test 1:", listToArray(result1)); // Expected: [1,2,3,5]

  // Test 2: Remove first node (head)
  let head2 = createList([1]);
  let result2 = solution.removeNthFromEnd(head2, 1);
  console.log("Test 2:", listToArray(result2)); // Expected: []

  // Test 3: Remove last node
  let head3 = createList([1, 2]);
  let result3 = solution.removeNthFromEnd(head3, 1);
  console.log("Test 3:", listToArray(result3)); // Expected: [1]

  // Test 4: Remove head when list has multiple nodes
  let head4 = createList([1, 2, 3]);
  let result4 = solution.removeNthFromEnd(head4, 3);
  console.log("Test 4:", listToArray(result4)); // Expected: [2,3]

  // Test 5: n = 1 (remove last node)
  let head5 = createList([1, 2, 3, 4, 5]);
  let result5 = solution.removeNthFromEnd(head5, 1);
  console.log("Test 5:", listToArray(result5)); // Expected: [1,2,3,4]
}
