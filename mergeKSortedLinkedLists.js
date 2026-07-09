// mergeKSortedLinkedLists.js

export default function run() {
  /*

Merge K Sorted Linked Lists

You are given an array of k linked-lists lists, each linked-list is sorted in ascending order.
Merge all the linked-lists into one sorted linked-list and return it.

Example:
Input: lists = [[1,4,5],[1,3,4],[2,6]]
Output: [1,1,2,3,4,4,5,6]

Explanation:
The linked-lists are:
[
  1 -> 4 -> 5,
  1 -> 3 -> 4,
  2 -> 6
]
Merging them produces: 1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6

Time Complexity :
Space Complexity:

*/

  class ListNode {
    constructor(val = 0, next = null) {
      this.val = val;
      this.next = next;
    }
  }

  class Solution {
    /**
     * @param {ListNode[]} lists
     * @return {ListNode}
     */

    mergeKLists(lists) {
      //   let result = null;
      //   for (const list of lists) {
      //     result = thus.mergeTwoLists(result, list);
      //   }
      //   return result;
      // Time: O(N·K) — the result list grows toward N nodes, and you do K merges, each potentially touching most of the growing result. Space: O(1) extra (nodes are reused).

      if (!lists || lists.length === 0) return null;
      while (lists.length > 1) {
        const merged = [];
        for (let i = 0; i < lists.length; i += 2) {
          const l1 = lists[i];
          const l2 = i + 1 < lists.length ? lists[i + 1] : null;
          merged.push(this.mergeTwoLists(l1, l2));
        }
        lists = merged;
      }
      return lists[0];
      // Time: O(N log K) — each of the log K rounds does O(N) total work across all its merges, since every node is touched exactly once per round. Space: O(K) — the temporary array of merged lists each round.
    }

    /**
     * Helper: Merge two sorted linked lists
     * @param {ListNode} l1
     * @param {ListNode} l2
     * @return {ListNode}
     */
    mergeTwoLists(l1, l2) {
      // Dummy node to simplify edge cases (no need to handle head separately)
      const dummy = new ListNode(0);
      let curr = dummy;

      // Compare nodes from both lists and build the merged list
      while (l1 && l2) {
        if (l1.val <= l2.val) {
          curr.next = l1;
          l1 = l1.next;
        } else {
          curr.next = l2;
          l2 = l2.next;
        }
        curr = curr.next; // move forward in result list
      }

      // Attach the remaining nodes (only one of l1 or l2 will have nodes left)
      curr.next = l1 ? l1 : l2;
      return dummy.next;
    }
  }

  // ==================== TEST CASES ====================

  const solution = new Solution();

  // Helper to create linked list from array
  function createList(arr) {
    if (!arr || arr.length === 0) return null;
    const dummy = new ListNode(0);
    let curr = dummy;
    for (let val of arr) {
      curr.next = new ListNode(val);
      curr = curr.next;
    }
    return dummy.next;
  }

  // Helper to convert linked list to array for printing
  function listToArray(head) {
    const result = [];
    let curr = head;
    while (curr) {
      result.push(curr.val);
      curr = curr.next;
    }
    return result;
  }

  // Test Case 1: Standard example

  const lists1 = [
    createList([1, 4, 5]),
    createList([1, 3, 4]),
    createList([2, 6]),
  ];
  console.log("Test 1:", listToArray(solution.mergeKLists(lists1)));
  // Expected: [1,1,2,3,4,4,5,6]

  console.log("");

  // Test Case 2: Empty array
  console.log("Test 2:", listToArray(solution.mergeKLists([])));
  // Expected: []

  // Test Case 3: Array with empty lists
  const lists3 = [createList([]), createList([]), createList([])];
  console.log("Test 3:", listToArray(solution.mergeKLists(lists3)));
  // Expected: []

  // Test Case 4: Single list
  const lists4 = [createList([1, 2, 3])];
  console.log("Test 4:", listToArray(solution.mergeKLists(lists4)));
  // Expected: [1,2,3]

  // Test Case 5: Two lists
  const lists5 = [createList([1, 3, 5]), createList([2, 4, 6])];
  console.log("Test 5:", listToArray(solution.mergeKLists(lists5)));
  // Expected: [1,2,3,4,5,6]

  // Test Case 6: Lists with different lengths
  const lists6 = [
    createList([1]),
    createList([2, 3, 4, 5]),
    createList([6, 7]),
  ];
  console.log("Test 6:", listToArray(solution.mergeKLists(lists6)));
  // Expected: [1,2,3,4,5,6,7]
}
