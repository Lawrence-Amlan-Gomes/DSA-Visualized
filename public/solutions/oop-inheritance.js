// oop-inheritance.js
// Phase 0.5, Section 3 — Inheritance: sharing behavior through "is-a".
export default function run() {
  /*

  Inheritance lets one class (the SUBCLASS) reuse and extend another class's
  (the PARENT's, or "base class's") fields and methods.

  Use it when the relationship is genuinely "IS-A" — a Dog IS AN Animal.

  `extends`     sets up the "is-a" link.
  `super(...)`  calls the parent's constructor first (required if the subclass
                defines its own constructor and the parent's constructor takes args).

  */

  class Animal {
    constructor(name) {
      this.name = name;
    }
    speak() {
      return `${this.name} makes a sound`;
    }
    describe() {
      return `${this.name} is an animal`;
    }
  }

  class Dog extends Animal {
    constructor(name, breed) {
      super(name); // must call this before using "this" — sets up the Animal part
      this.breed = breed;
    }
    speak() {
      // OVERRIDING: Dog redefines speak(), replacing Animal's version
      return `${this.name} barks`;
    }
    // describe() is NOT overridden — Dog inherits Animal's version as-is
  }

  const a = new Animal('Generic');
  const d = new Dog('Rex', 'Labrador');

  console.log(a.speak()); // "Generic makes a sound"
  console.log(d.speak()); // "Rex barks" — Dog's own version wins
  console.log(d.describe()); // "Rex is an animal" — inherited straight from Animal, unchanged
  console.log('d instanceof Animal:', d instanceof Animal); // true — Dog IS an Animal
  console.log('d.breed (only Dog has this):', d.breed);

  /*

  WHERE INHERITANCE GETS YOU INTO TROUBLE — two problems worth naming directly:

  1) THE FRAGILE BASE CLASS PROBLEM
     A change to the parent class can silently break subclasses in ways that
     aren't obvious from reading the subclass alone, because the subclass's
     correctness depends on assumptions about how the parent behaves internally.

  2) DEEP HIERARCHIES ARE HARD TO REASON ABOUT
     If D extends C extends B extends A, answering "where does this method
     actually come from?" means walking up FOUR classes.

  */

  // A worked example of problem #1 — watch what happens when Animal changes:
  class AnimalV2 {
    constructor(name) {
      this.name = name;
      this.speakCount = 0; // NEW field added to the parent
    }
    speak() {
      this.speakCount++; // NEW behavior added to the parent
      return `${this.name} makes a sound (spoken ${this.speakCount} times)`;
    }
  }

  class DogV2 extends AnimalV2 {
    speak() {
      // Whoever wrote THIS override, long before speakCount existed, still calls
      // super.speak() to "reuse" the parent behavior — and now silently inherits
      // speakCount tracking too, without ever being told that would happen.
      const parentResult = super.speak();
      return `${parentResult} — WOOF`;
    }
  }

  const dogV2 = new DogV2('Buddy');
  console.log(dogV2.speak()); // picked up speakCount tracking nobody asked for
  console.log(dogV2.speak());
  console.log('speakCount silently exists on DogV2 now:', dogV2.speakCount);

  console.log('--- done: inheritance = "is-a", powerful but easy to overuse ---');
  console.log('--- see oop-compositionVsInheritance.js for the usual alternative ---');
}
