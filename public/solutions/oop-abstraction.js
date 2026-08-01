// oop-abstraction.js
// Phase 0.5, Section 2 — Abstraction: show the simple part, hide the complicated part.
export default function run() {
  /*

  ABSTRACTION means giving something a simple, easy-to-use interface, while
  hiding HOW it actually works underneath.

  Real-world version: a car has a steering wheel and pedals. You don't need to
  know how the engine burns fuel to drive it. The "how" is hidden behind a
  simple "what."

  Below, PaymentProcessor has exactly ONE public method: charge(). The caller
  never sees, and never needs to see, what happens inside #sendToProvider().

  */

  class PaymentProcessor {
    charge(amountInCents) {
      console.log(`Charging $${(amountInCents / 100).toFixed(2)}...`);
      return this.#sendToProvider(amountInCents);
    }

    // private method — this is the "messy" part hidden behind charge()
    #sendToProvider(amountInCents) {
      // Pretend this does real network calls, retries, auth headers, etc.
      // The caller of charge() has NO idea any of this exists.
      const fakeTransactionId = `txn_${amountInCents}_${Date.now()}`;
      return { success: true, transactionId: fakeTransactionId };
    }
  }

  const processor = new PaymentProcessor();
  const result = processor.charge(2599); // $25.99
  console.log('Result:', result);

  // Whoever calls .charge(amount) only ever thinks in terms of "charge this much."
  // They don't think about retries, network errors, or which provider is behind it.
  // THAT is abstraction — a simple surface hiding real complexity.

  /*

  ABSTRACTION vs. ENCAPSULATION — the difference that trips people up:

    ENCAPSULATION is about restricting ACCESS — bundling data with methods and
    locking outside code out of the raw data (see oop-classesAndEncapsulation.js).

    ABSTRACTION is about SIMPLIFYING — designing the interface so the user only
    sees what they need, regardless of whether the data underneath is technically
    "hidden" or not.

  One-line way to keep these straight in an interview:
    Encapsulation = hiding DATA.
    Abstraction   = hiding COMPLEXITY behind a simple interface.

  A class can be a good abstraction (simple to use) even if you could technically
  inspect its internals. And a class can encapsulate its fields tightly while still
  exposing a genuinely complicated, unpleasant interface. They usually show up
  TOGETHER in good code, but they are two separate design goals.

  */

  // A second example, showing the SAME idea with something you already know:
  // Array.prototype.sort() is an abstraction over a real sorting algorithm.
  const numbers = [5, 2, 8, 1, 9];
  console.log('Before sort:', numbers);
  numbers.sort((a, b) => a - b);
  console.log('After sort: ', numbers);
  // You called .sort() and got a sorted array back. You did NOT need to know
  // whether the engine used quicksort, merge sort, or timsort internally —
  // that implementation detail is abstracted away behind one method call.

  console.log('--- done: abstraction = simple interface, hidden complexity ---');
}
