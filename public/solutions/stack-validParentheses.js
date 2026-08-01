// validParentheses.js
export default function run() {
  /*
Given a string s containing just the characters '(', ')', '{', '}', '[' and ']',
determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Time Complexity :
Space Complexity:
*/

  class Solution {
    /**
     * @param {string} s
     * @return {boolean}
     */

    isValid(s) {
      // let prevLength;
      // do {
      //   prevLength = s.length;
      //   s = s.replace("()", "").replace("[]", "").replace("{}", "");
      // } while (s.length !== prevLength);
      // return s.length === 0;
      // Time: O(n²) — each pass scans the string and up to n/2 passes may be needed. Space: O(n) — each replace builds a new string.

      const stack = [];
      const closeToOpen = { ")": "(", "]": "[", "}": "{" };
      for (const c of s) {
        if (closeToOpen[c]) {
          if (stack.length && stack[stack.length - 1] === closeToOpen[c]) {
            stack.pop();
          } else {
            return false;
          }
        } else {
          stack.push(c);
        }
      }
      return stack.length === 0;
      // Time: O(n) — one pass through the string. Space: O(n) — the stack, worst case all opens.
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
}
