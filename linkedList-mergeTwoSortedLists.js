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

Time Complexity : O(N + M)     [where N and M are lengths of both lists]
Space Complexity: O(1)         [we reuse existing nodes, only dummy node extra]

This is the optimal iterative two-pointer solution (NeetCode standard).
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
      const dummy = { val: 0, next: null }; // declare dummy head node for merged list
      let node = dummy; // keep track of the current node in the merged list
      while (list1 && list2) { // loop until either list1 or list2 is null
        if (list1.val < list2.val) { // find out the smaller node
          node.next = list1; // attach the smaller node to the merged list
          list1 = list1.next; // move the pointer of that list forward
        } else {
          node.next = list2; // else, attach the another list's smaller node to the merged list
          list2 = list2.next; // move the pointer of that list forward
        }
        node = node.next; // move the merged list pointer forward as well
      }
      if (list1) { /* After the loop, at least one of the lists is null. 
        Attach the non-null list to the merged list. */
        node.next = list1; // If list1 is not null, attach it to the merged list
      } else {
        node.next = list2; // If list2 is not null, attach it to the merged list
      }
      return dummy.next; // Return dummy.next as the head of the merged list (skip the dummy node)
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
  // Expected: [1,1,2,3,4,4]

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

  /*


Creat a dummy head node of the merged list. Run a while loop until either list1 or list2 is null.
Compare the current nodes of both lists, attach the smaller one to the merged list, and 
move the pointer of that list forward. Move the merged list pointer forward as well.
After the loop, at least one of the lists is null. Attach the non-null list to the merged list.
Return dummy.next as the head of the merged list.   


*/
}
