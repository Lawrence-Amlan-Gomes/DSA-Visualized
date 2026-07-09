// mergeTwoSortedLists.js
export default function run() {
  /*
Merge Two Sorted Lists

You are given the heads of two sorted linked lists list1 and list2.
Merge the two lists into one sorted list and return the head of the merged linked list.

The merged list should be made by splicing together the nodes of the first two lists.

Example 1:
Input: list1 = [1,2,4], list2 = [1,3,4]
Output: [1,1,2,3,4,4]

Example 2:
Input: list1 = [], list2 = []
Output: []

Example 3:
Input: list1 = [], list2 = [0]
Output: [0]

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

  /**
   * Definition for singly-linked list.
   * class ListNode {
   *     constructor(val = 0, next = null) {
   *         this.val = val;
   *         this.next = next;
   *     }
   * }
   */
  class Solution {
    /**
     * @param {ListNode} list1
     * @param {ListNode} list2
     * @return {ListNode}
     */

    mergeTwoLists(list1, list2) {
      // const vals = [];
      // for (let n = list1; n; n = n.next) vals.push(n.val);
      // for (let n = list2; n; n = n.next) vals.push(n.val);
      // vals.sort((a, b) => a - b);
      // const dummy = new ListNode();
      // let tail = dummy;
      // for (const v of vals) {
      //   tail.next = new ListNode(v);
      //   tail = tail.next;
      // }
      // return dummy.next;
      // Time: O((n+m) log(n+m)) — the sort dominates, and it ignores that both lists were already sorted. Space: O(n+m) — the array plus a whole new set of nodes.

      const dummy = { val: 0, next: null };
      let node = dummy;
      while (list1 && list2) {
        if (list1.val < list2.val) {
          node.next = list1;
          list1 = list1.next;
        } else {
          node.next = list2;
          list2 = list2.next;
        }
        node = node.next;
      }
      node.next = list1 ? list1 : list2;
      return dummy.next;
      // Time: O(n + m) — one pass through both lists combined. Space: O(1) — reuses existing nodes, only the dummy is extra.
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

  console.log("=== Merge Two Sorted Lists Tests ===");

  // Test 1: Standard case
  let list1 = createLinkedList([1, 2, 3, 4]);
  let list2 = createLinkedList([1, 5, 9]);
  console.log(linkedListToArray(solution.mergeTwoLists(list1, list2)));
  // Expected: [1,1,2,3,4,5,9]

  // Test 2: One empty list
  list1 = createLinkedList([]);
  list2 = createLinkedList([0]);
  console.log(linkedListToArray(solution.mergeTwoLists(list1, list2)));
  // Expected: [0]

  // Test 3: Both empty
  list1 = createLinkedList([]);
  list2 = createLinkedList([]);
  console.log(linkedListToArray(solution.mergeTwoLists(list1, list2)));
  // Expected: []

  // Test 4: Different lengths
  list1 = createLinkedList([1, 3, 5, 7]);
  list2 = createLinkedList([2, 4, 6]);
  console.log(linkedListToArray(solution.mergeTwoLists(list1, list2)));
  // Expected: [1,2,3,4,5,6,7]

  // Test 5: Duplicates and equal values
  list1 = createLinkedList([2, 2, 2]);
  list2 = createLinkedList([1, 2, 3]);
  console.log(linkedListToArray(solution.mergeTwoLists(list1, list2)));
  // Expected: [1,2,2,2,2,3]
}
