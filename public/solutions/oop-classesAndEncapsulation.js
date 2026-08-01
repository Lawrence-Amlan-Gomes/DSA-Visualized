// oop-classesAndEncapsulation.js
// Phase 0.5, Section 1 — Classes & Objects, then Encapsulation.
// This file is meant to be READ and RUN, not solved — every answer is already here.
// Open DevTools, run this file, then read the comments next to each console.log.
export default function run() {
  /*

  CLASS  = a blueprint. Not a real thing by itself — just says what fields (data)
           and methods (actions) every object built from it will have.
  OBJECT = one real thing built from that blueprint ("an instance of the class").

  You can build many objects from the same class. Each one keeps its OWN data,
  even though they share the same methods.

  */

  class Dog {
    constructor(name) {
      this.name = name; // each Dog object gets its own name — this is per-object data
    }

    bark() {
      console.log(`${this.name} says woof!`);
    }
  }

  const rex = new Dog('Rex'); // one object
  const fido = new Dog('Fido'); // a different object, same blueprint

  rex.bark(); // "Rex says woof!"
  fido.bark(); // "Fido says woof!" — different data, same method

  console.log('rex.name  =', rex.name);
  console.log('fido.name =', fido.name);
  console.log('rex and fido are separate objects:', rex !== fido);

  /*

  ENCAPSULATION means two things at once:
    1) Bundle an object's data with the methods that work on that data.
    2) HIDE the internal details — outside code can only touch that data
       through a small, controlled set of methods, never directly.

  Below, "#balance" is a PRIVATE field (the "#" is real JavaScript syntax,
  not a naming convention). Nothing outside this class can read or set it directly.

  */

  class BankAccount {
    #balance = 0; // private — invisible and unreachable from outside the class

    deposit(amount) {
      if (amount <= 0) throw new Error('Deposit must be positive');
      this.#balance += amount;
    }

    withdraw(amount) {
      if (amount > this.#balance) throw new Error('Insufficient funds');
      this.#balance -= amount;
    }

    getBalance() {
      return this.#balance; // the ONLY way outside code can ever read the balance
    }
  }

  const acc = new BankAccount();
  acc.deposit(100);
  acc.deposit(50);
  console.log('Balance after two deposits:', acc.getBalance()); // 150

  try {
    acc.withdraw(1000); // more than the balance
  } catch (e) {
    console.log('Blocked bad withdrawal:', e.message); // "Insufficient funds"
  }

  // acc.#balance = -9999;
  // ^ uncomment this line and re-run — it will throw a SyntaxError.
  // That's the entire point: nothing outside BankAccount can bypass deposit()/withdraw()
  // and put the account into an invalid state. The class protects its own rules.

  /*

  WHY hide the balance instead of just letting anyone set it directly?

  If "balance" were a plain public field, any code anywhere could set it to a
  negative number, or a string, or skip the "insufficient funds" check entirely —
  nothing would stop it. By forcing every change through deposit()/withdraw(),
  the class GUARANTEES the balance is always valid.

  It also means the class is free to change HOW the balance is stored later
  (move it to a database, add a transaction log, whatever) without breaking a
  single line of code anywhere else that calls deposit()/withdraw()/getBalance() —
  the outside world only ever depends on those three method names, never on
  the private implementation behind them.

  */

  console.log('--- done: classes are blueprints, objects are built from them, ---');
  console.log('--- encapsulation hides data behind methods so the object can ---');
  console.log('--- protect its own rules. ---');
}
