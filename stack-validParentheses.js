// validParentheses.js
export default function run() {
/*
Given a string s containing just the characters '(', ')', '{', '}', '[' and ']',
determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Time Complexity : O(N)     [single pass through the string]
Space Complexity: O(N)     [stack in worst case]

This is the OPTIMAL stack solution (NeetCode / LeetCode standard).
*/

class Solution {
  /**
   * @param {string} s
   * @return {boolean}
   */

  isValid(s) {
    // Category: Stack
    const stack = []; // We will use this stack to keep track of opening brackets
    const closeToOpen = { // This helps to check the corresponding opening bracket for closing bracket
      ')': '(',
      ']': '[',
      '}': '{',
    };
    for (let c of s) { // loop through each character in the string
      if (closeToOpen[c]) { // If it's a closing bracket, we need to check for a match
        if ( /* If the stack is not empty and 
          the top of the stack is the corresponding opening bracket of the Closing bracket */
          stack.length > 0 &&
          stack[stack.length - 1] === closeToOpen[c]
        ) {
          stack.pop(); // Then we pop the opening bracket from the stack because it's a valid pair
        } else { /* Otherwise, it's either a mismatch or 
                    the stack is empty (no opening bracket to match), so it's invalid */
          return false;
        }
      } else { /* If it's an opening bracket, 
                  we simply push it onto the stack to wait for a matching closing bracket */
        stack.push(c);
      }
    }
    return stack.length === 0; /* If we reach here, it means all opening brackets were matched properly
                                  above and the stack is empty */
  }

}

// Test
const solution = new Solution();

console.log(solution.isValid("()"));
// Expected: true

console.log(solution.isValid("()[]{}"));
// Expected: true

console.log(solution.isValid("(]"));
// Expected: false

console.log(solution.isValid("([)]"));
// Expected: false

console.log(solution.isValid("{[]}"));
// Expected: true

console.log(solution.isValid(""));
// Expected: true

console.log(solution.isValid("("));
// Expected: false

console.log(solution.isValid(")"));
// Expected: false

console.log(solution.isValid("((("));
// Expected: false

console.log(solution.isValid("){}"));
// Expected: false

console.log(solution.isValid("({[)]}"));
// Expected: false

console.log(solution.isValid("()("));
// Expected: false

/*

We use a stack to track every opening bracket we see.
Whenever a closing bracket arrives, we instantly check if the most recent
unmatched opening bracket (top of stack) is the correct pair. If it matches,
we pop it (they cancel each other). If it doesn't match or the stack is empty,
the string is invalid right away. After scanning the whole string, the stack
must be completely empty — meaning every open had a perfect closing partner
in the right order. This single-pass stack approach is greedy, linear, and
guarantees we catch any mismatch without backtracking.

*/
}