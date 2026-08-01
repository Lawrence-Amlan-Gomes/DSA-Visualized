// trie-implementTrie.js

export default function run() {
  /*
Implement a trie (prefix tree) with insert, search, and startsWith methods.

A trie is a tree-like data structure used to efficiently store and retrieve keys in a
dataset of strings. Every node represents a single character; a path from the root down
to a node spells out a prefix, and some nodes are marked as the end of a complete word.

Implement the Trie class:
- Trie() Initializes the trie object.
- insert(word) Inserts the string word into the trie.
- search(word) Returns true if word was previously inserted into the trie, false otherwise.
- startsWith(prefix) Returns true if a previously inserted word has prefix as a prefix, false otherwise.

Example:
Input:
["Trie", "insert", "search", "search", "startsWith", "insert", "search"]
[[], ["apple"], ["apple"], ["app"], ["app"], ["app"], ["app"]]
Output:
[null, null, true, false, true, null, true]

Time Complexity : O(L) per operation, where L is the length of the word/prefix
Space Complexity: O(N * L) total, where N is the number of inserted words and L is average word length

*/
  class Trie {
    constructor() {
      this.val = null;
      this.isDone = false;
      this.children = [];
      this.childrenValues = [];
    }

    /**
     * @param {string} word
     * @return {void}
     */
    insert(word) {
      if (word.length === 0) {
        this.isDone = true;
        return;
      }

      let currentNode = this;

      for (let i = 0; i < word.length; i++) {
        if (i < word.length - 1) {
          if (!currentNode.childrenValues.includes(word[i])) {
            currentNode.childrenValues.push(word[i]);

            const child = {
              val: word[i],
              isDone: false,
              children: [],
              childrenValues: [],
            };

            currentNode.children.push(child);
            currentNode = currentNode.children[currentNode.children.length - 1];
          } else {
            const index = currentNode.childrenValues.indexOf(word[i]);
            currentNode = currentNode.children[index];
          }
        } else {
          if (!currentNode.childrenValues.includes(word[i])) {
            currentNode.childrenValues.push(word[i]);

            const child = {
              val: word[i],
              isDone: true,
              children: [],
              childrenValues: [],
            };

            currentNode.children.push(child);
            currentNode = currentNode.children[currentNode.children.length - 1];
          } else {
            const index = currentNode.childrenValues.indexOf(word[i]);
            currentNode = currentNode.children[index];
            currentNode.isDone = true;
          }
        }
      }
    }

    /**
     * @param {string} word
     * @return {boolean}
     */
    search(word) {
      let currentNode = this;

      for (let i = 0; i < word.length; i++) {
        if (!currentNode.childrenValues.includes(word[i])) {
          return false;
        }

        const index = currentNode.childrenValues.indexOf(word[i]);
        currentNode = currentNode.children[index];
      }

      return currentNode.isDone;
    }

    /**
     * @param {string} prefix
     * @return {boolean}
     */
    startsWith(prefix) {
      let currentNode = this;

      for (let i = 0; i < prefix.length; i++) {
        if (!currentNode.childrenValues.includes(prefix[i])) {
          return false;
        }

        const index = currentNode.childrenValues.indexOf(prefix[i]);
        currentNode = currentNode.children[index];
      }

      return true;
    }
  }

  // this implementation has O(n × k) time complexity for insert, search, and startsWith (where n is the word length and k is the maximum number of children at a node), with O(n) space for insert in the worst case and O(1) extra space for search and startsWith.

  const trie0 = new Trie();
  trie0.insert("cat");
  trie0.insert("car");
  trie0.insert("bat");
  console.log(trie0);

  const trie1 = new Trie();
  console.log(trie1.search("apple")); // true
  console.log(trie1.search("app")); // false
  console.log(trie1.startsWith("app")); // true
  trie1.insert("app");
  console.log(trie1.search("app")); // true

  console.log("");

  const trie2 = new Trie();
  console.log(trie2.search("a")); // false
  console.log(trie2.startsWith("a")); // false

  console.log("");

  const trie3 = new Trie();
  ["cat", "car", "card", "care", "dog"].forEach((w) => trie3.insert(w));
  console.log(trie3.search("cat")); // true
  console.log(trie3.search("ca")); // false
  console.log(trie3.startsWith("ca")); // true
  console.log(trie3.search("care")); // true
  console.log(trie3.search("careful")); // false
  console.log(trie3.startsWith("do")); // true
  console.log(trie3.startsWith("dogs")); // false

  console.log("");

  const trie4 = new Trie();
  trie4.insert("");
  console.log(trie4.search("")); // true
  console.log(trie4.startsWith("")); // true

  // --- Test Cases Batch (Silent on Success) ---
  let failures = 0;
  const test = (num, ops, args, expected) => {
    const originalLog = console.log;
    console.log = () => {}; // Silence internal logs
    const trie = new Trie();
    const actual = [null];
    for (let i = 1; i < ops.length; i++) {
      actual.push(trie[ops[i]](...args[i]));
    }
    console.log = originalLog; // Restore logging

    const norm = (v) => (v === undefined ? null : v);
    const mismatch = actual.some((v, i) => norm(v) !== norm(expected[i]));
    if (mismatch) {
      failures++;
      console.log(
        `${num}: ❌ Failed (Expected ${JSON.stringify(expected)}, Got ${JSON.stringify(actual)})`,
      );
    }
  };

  console.log(" ");

  // 1: classic example
  test(
    1,
    ["Trie", "insert", "search", "search", "startsWith", "insert", "search"],
    [[], ["apple"], ["apple"], ["app"], ["app"], ["app"], ["app"]],
    [null, null, true, false, true, null, true],
  );

  // 2: empty trie lookups
  test(
    2,
    ["Trie", "search", "startsWith"],
    [[], ["a"], ["a"]],
    [null, false, false],
  );

  // 3: branching words
  test(
    3,
    [
      "Trie",
      "insert",
      "insert",
      "insert",
      "insert",
      "insert",
      "search",
      "search",
      "startsWith",
      "search",
      "search",
      "startsWith",
      "startsWith",
    ],
    [
      [],
      ["cat"],
      ["car"],
      ["card"],
      ["care"],
      ["dog"],
      ["cat"],
      ["ca"],
      ["ca"],
      ["care"],
      ["careful"],
      ["do"],
      ["dogs"],
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      true,
      false,
      true,
      true,
      false,
      true,
      false,
    ],
  );

  // 4: empty string word
  test(
    4,
    ["Trie", "insert", "search", "startsWith"],
    [[], [""], [""], [""]],
    [null, null, true, true],
  );

  // 5: single-character words
  test(
    5,
    ["Trie", "insert", "insert", "search", "search", "search", "startsWith"],
    [[], ["a"], ["b"], ["a"], ["b"], ["c"], ["a"]],
    [null, null, null, true, true, false, true],
  );

  // 6: a word that is a prefix of another, searched before the longer word exists
  test(
    6,
    ["Trie", "insert", "search", "insert", "search", "search"],
    [[], ["ab"], ["ab"], ["abc"], ["ab"], ["abc"]],
    [null, null, true, null, true, true],
  );

  // 7: repeated insert of the same word
  test(
    7,
    ["Trie", "insert", "insert", "search", "startsWith"],
    [[], ["hello"], ["hello"], ["hello"], ["hell"]],
    [null, null, null, true, true],
  );

  // 8: long shared prefix, then divergence
  test(
    8,
    [
      "Trie",
      "insert",
      "insert",
      "search",
      "search",
      "startsWith",
      "startsWith",
    ],
    [
      [],
      ["interview"],
      ["internet"],
      ["interview"],
      ["inter"],
      ["inter"],
      ["interne"],
    ],
    [null, null, null, true, false, true, true],
  );

  if (failures === 0) console.log("✅ All success");
}
