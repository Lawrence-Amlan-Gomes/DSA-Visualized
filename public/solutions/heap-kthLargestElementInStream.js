// heap-kthLargestElementInStream.js

export default function run() {
  /*
Design a class to find the kth largest element in a stream of numbers.

Implement KthLargest:
- KthLargest(k, nums) Initializes the object with the integer k and the stream of
  integers nums.
- add(val) Appends val to the stream and returns the element representing the kth
  largest element in the stream.

Example:
Input:
["KthLargest", "add", "add", "add", "add", "add"]
[[3, [4, 5, 8, 2]], [3], [5], [10], [9], [4]]
Output:
[null, 4, 5, 5, 8, 8]

Time Complexity :
Space Complexity:

*/

  // class KthLargest {
  //   constructor(k, nums) {
  //     this.k = k;
  //     this.stream = [...nums];
  //   }
  //   add(val) {
  //     this.stream.push(val);
  //     this.stream.sort((a, b) => b - a);
  //     return this.stream[this.k - 1];
  //   }
  // }
  // Time: O(n log n) per add() call, where n is how many numbers have been seen so far — and n only grows, so later calls get slower and slower. Space: O(n) — every number ever seen is kept around forever.

  class MinHeap {
    constructor() {
      this.data = [];
    }
    size() {
      return this.data.length;
    }
    peek() {
      return this.data[0];
    }
    push(val) {
      this.data.push(val);
      let i = this.data.length - 1;
      while (i > 0) {
        const parent = Math.floor((i - 1) / 2);
        if (this.data[parent] <= this.data[i]) break;
        [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
        i = parent;
      }
    }
    pop() {
      const top = this.data[0];
      const last = this.data.pop();
      if (this.data.length > 0) {
        this.data[0] = last;
        let i = 0;
        const n = this.data.length;
        while (true) {
          let smallest = i;
          const left = 2 * i + 1,
            right = 2 * i + 2;
          if (left < n && this.data[left] < this.data[smallest])
            smallest = left;
          if (right < n && this.data[right] < this.data[smallest])
            smallest = right;
          if (smallest === i) break;
          [this.data[i], this.data[smallest]] = [
            this.data[smallest],
            this.data[i],
          ];
          i = smallest;
        }
      }
      return top;
    }
  }

  class KthLargest {
    constructor(k, nums) {
      this.k = k;
      this.heap = new MinHeap();
      for (const num of nums) this.add(num);
    }
    add(val) {
      this.heap.push(val);
      if (this.heap.size() > this.k) this.heap.pop();
      return this.heap.peek();
    }
  }
  // Time: O(log k) per add() call — the heap never holds more than k elements, so both push's bubble-up and pop's bubble-down are bounded by the heap's height, log k. Space: O(k) — the heap only ever stores the k largest values.

  const kl1 = new KthLargest(3, [4, 5, 8, 2]);
  console.log(kl1.add(3)); // 4
  console.log(kl1.add(5)); // 5
  console.log(kl1.add(10)); // 5
  console.log(kl1.add(9)); // 8
  console.log(kl1.add(4)); // 8

  console.log("");

  const kl2 = new KthLargest(1, []);
  console.log(kl2.add(-3)); // -3
  console.log(kl2.add(-2)); // -2
  console.log(kl2.add(-4)); // -2
  console.log(kl2.add(0)); // 0
  console.log(kl2.add(4)); // 4

  // --- Test Cases Batch (Silent on Success) ---
  let failures = 0;
  const test = (num, k, initialNums, addCalls, expected) => {
    const originalLog = console.log;
    console.log = () => {}; // Silence internal logs
    const kl = new KthLargest(k, initialNums);
    const actual = addCalls.map((val) => kl.add(val));
    console.log = originalLog; // Restore logging

    const mismatch = actual.some((v, i) => v !== expected[i]);
    if (mismatch) {
      failures++;
      console.log(
        `${num}: ❌ Failed (Expected ${JSON.stringify(expected)}, Got ${JSON.stringify(actual)})`,
      );
    }
  };

  console.log(" ");

  // 1: classic example
  test(1, 3, [4, 5, 8, 2], [3, 5, 10, 9, 4], [4, 5, 5, 8, 8]);

  // 2: k = 1, starts empty — kth largest is always just the max so far
  test(2, 1, [], [-3, -2, -4, 0, 4], [-3, -2, -2, 0, 4]);

  // 3: k larger than the initial stream length
  test(3, 4, [7, 7, 7, 7, 8, 3], [2, 10, 6], [7, 7, 7]);

  // 4: duplicates throughout
  test(4, 2, [3, 3], [3, 3, 3], [3, 3, 3]);

  // 5: negative numbers only
  test(5, 2, [-10, -5, -20], [-1, -15, -3], [-5, -5, -3]);

  if (failures === 0) console.log("✅ All success");
}
