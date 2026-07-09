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
     * @return {boolean}
     */

    hasCycle(head) {
      //   const seen = new Set();
      //   let node = head;
      //   while (node) {
      //     if (seen.has(node)) return true;
      //     seen.add(node);
      //     node = node.next;
      //   }
      //   return false;
      // Time: O(n) — each node visited once. Space: O(n) — the Set can hold every node.

      let slow = head;
      let fast = head;
      while (fast !== null && fast.next !== null) {
        fast = fast.next.next;
        slow = slow.next;
        if (fast === slow) return true;
      }
      return false;
      // Time: O(n) — fast catches up within one full loop of the cycle. Space: O(1) — just two pointers.
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
}
