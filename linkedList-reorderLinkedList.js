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
     * @return {void}
     */

    reorderList(head) {
      //   const nodes = [];
      //   for (let n = head; n; n = n.next) nodes.push(n);
      //   let i = 0,
      //     j = nodes.length - 1;
      //   while (i < j) {
      //     nodes[i].next = nodes[j];
      //     i++;
      //     if (i === j) break;
      //     nodes[j].next = nodes[i];
      //     j--;
      //   }
      //   nodes[i].next = null;
      // Time: O(n) — one pass to collect, one pass to relink. Space: O(n) — the array holds a reference to every node.

      let slow = head,
        fast = head.next;
      while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
      }
      let second = slow.next;
      slow.next = null;
      let prev = null;
      while (second) {
        const tmp = second.next;
        second.next = prev;
        prev = second;
        second = tmp;
      }
      let first = head;
      second = prev;
      while (second) {
        const t1 = first.next,
          t2 = second.next;
        first.next = second;
        second.next = t1;
        first = t1;
        second = t2;
      }

      // Time: O(n) — each of the three steps is a single pass. Space: O(1) — everything is re-linked in place, no extra storage.
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

  // Test 2: Longer list, even length

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
}
