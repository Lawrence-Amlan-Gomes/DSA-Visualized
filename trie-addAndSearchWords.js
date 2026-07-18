// trie-addAndSearchWords.js

export default function run() {
  /*
Design a data structure that supports adding new words and finding whether a string
matches any previously added word, where the search string may contain '.' as a
wildcard that can match any single letter.

Implement the WordDictionary class:
- WordDictionary() Initializes the object.
- addWord(word) Adds word to the data structure, can be matched later.
- search(word) Returns true if there is any string previously added that matches word.
  word may contain dots '.' where dots can be matched with any letter.

Example:
Input:
["WordDictionary","addWord","addWord","addWord","search","search","search","search"]
[[],["bad"],["dad"],["mad"],["pad"],["bad"],[".ad"],["b.."]]
Output:
[null,null,null,null,false,true,true,true]

Time Complexity : addWord O(L). search O(L) for a literal word, up to O(26^D) worst case
                  when word is all dots, where D is the number of dot characters — each dot
                  branches into every child at that node.
Space Complexity: O(total characters added), plus O(L) recursion depth per search call.

*/

  // class WordDictionary {
  //   constructor() {
  //     this.words = [];
  //   }
  //   addWord(word) {
  //     this.words.push(word);
  //   }
  //   search(word) {
  //     return this.words.some((w) => {
  //       if (w.length !== word.length) return false;
  //       for (let i = 0; i < word.length; i++) {
  //         if (word[i] !== "." && word[i] !== w[i]) return false;
  //       }
  //       return true;
  //     });
  //   }
  // }
  // Time: O(N · L) per search — every stored word compared, up to L characters each. Space: O(N · L) total characters stored.

  class TrieNode {
    constructor() {
      this.children = {};
      this.isEnd = false;
    }
  }

  class WordDictionary {
    constructor() {
      this.root = new TrieNode();
    }

    addWord(word) {
      let node = this.root;
      for (const ch of word) {
        if (!node.children[ch]) node.children[ch] = new TrieNode();
        node = node.children[ch];
      }
      node.isEnd = true;
    }

    search(word) {
      const dfs = (node, i) => {
        if (!node) return false;
        if (i === word.length) return node.isEnd;

        const ch = word[i];
        if (ch === ".") {
          for (const key in node.children) {
            if (dfs(node.children[key], i + 1)) return true;
          }
          return false;
        }
        if (!node.children[ch]) return false;
        return dfs(node.children[ch], i + 1);
      };
      return dfs(this.root, 0);
    }
  }
  // Time: O(L) for a search with no dots — same as a plain Trie. Worst case with all dots: O(26D · L), where D is the number of dots, since each one branches into every child. In practice it's usually much better, bounded by how many words actually share those prefixes. Space: O(total characters added) for the trie, plus O(L) recursion depth per search.

  const wd1 = new WordDictionary();
  wd1.addWord("bad");
  wd1.addWord("dad");
  wd1.addWord("mad");
  console.log(wd1.search("pad")); // false
  console.log(wd1.search("bad")); // true
  console.log(wd1.search(".ad")); // true
  console.log(wd1.search("b..")); // true

  console.log("");

  const wd2 = new WordDictionary();
  wd2.addWord("abc");
  console.log(wd2.search("...")); // true
  console.log(wd2.search("..")); // false
  console.log(wd2.search("....")); // false

  console.log("");

  const wd3 = new WordDictionary();
  console.log(wd3.search("a")); // false
  console.log(wd3.search(".")); // false

  console.log("");

  const wd4 = new WordDictionary();
  wd4.addWord("hello");
  console.log(wd4.search(".ello")); // true
  console.log(wd4.search("he.lo")); // true
  console.log(wd4.search("hell.")); // true
  console.log(wd4.search("h.l.o")); // true

  // --- Test Cases Batch (Silent on Success) ---
  let failures = 0;
  const test = (num, ops, args, expected) => {
    const originalLog = console.log;
    console.log = () => {}; // Silence internal logs
    const wd = new WordDictionary();
    const actual = [null];
    for (let i = 1; i < ops.length; i++) {
      actual.push(wd[ops[i]](...args[i]));
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
    [
      "WordDictionary",
      "addWord",
      "addWord",
      "addWord",
      "search",
      "search",
      "search",
      "search",
    ],
    [[], ["bad"], ["dad"], ["mad"], ["pad"], ["bad"], [".ad"], ["b.."]],
    [null, null, null, null, false, true, true, true],
  );

  // 2: all-wildcard search, and wrong-length wildcards
  test(
    2,
    ["WordDictionary", "addWord", "search", "search", "search"],
    [[], ["abc"], ["..."], [".."], ["...."]],
    [null, null, true, false, false],
  );

  // 3: empty dictionary
  test(
    3,
    ["WordDictionary", "search", "search"],
    [[], ["a"], ["."]],
    [null, false, false],
  );

  // 4: wildcard at start, middle, end, and mixed
  test(
    4,
    ["WordDictionary", "addWord", "search", "search", "search", "search"],
    [[], ["hello"], [".ello"], ["he.lo"], ["hell."], ["h.l.o"]],
    [null, null, true, true, true, true],
  );

  // 5: no match even with wildcards, wrong length
  test(
    5,
    ["WordDictionary", "addWord", "search", "search"],
    [[], ["cat"], ["ca"], ["cats"]],
    [null, null, false, false],
  );

  // 6: multiple words sharing a prefix, wildcard disambiguates
  test(
    6,
    [
      "WordDictionary",
      "addWord",
      "addWord",
      "addWord",
      "search",
      "search",
      "search",
    ],
    [[], ["cat"], ["car"], ["can"], ["ca."], ["c.t"], ["c.n"]],
    [null, null, null, null, true, true, true],
  );

  // 7: repeated addWord
  test(
    7,
    ["WordDictionary", "addWord", "addWord", "search"],
    [[], ["a"], ["a"], ["a"]],
    [null, null, null, true],
  );

  if (failures === 0) console.log("✅ All success");
}
