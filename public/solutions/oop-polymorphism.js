// oop-polymorphism.js
// Phase 0.5, Section 5 — Polymorphism: one call, many behaviors.
export default function run() {
  /*

  POLYMORPHISM means: different objects can respond to the exact same method
  call, each in its own way — and the CALLING CODE doesn't need to know which
  specific type it's dealing with.

  */

  class Animal {
    speak() {
      return '...';
    }
  }
  class Dog extends Animal {
    speak() {
      return 'Woof';
    }
  }
  class Cat extends Animal {
    speak() {
      return 'Meow';
    }
  }
  class Cow extends Animal {
    speak() {
      return 'Moo';
    }
  }

  const animals = [new Dog(), new Cat(), new Cow()];
  for (const animal of animals) {
    // this loop NEVER checks "what kind of animal is this?" — it just calls .speak()
    console.log(animal.speak());
  }
  // Woof
  // Meow
  // Moo

  // The loop has no idea, and doesn't need to know, whether it's holding a Dog,
  // a Cat, or a Cow. Each object knows how to handle the call itself.

  /*

  OVERRIDING vs. OVERLOADING — not the same thing:

    OVERRIDING: a subclass redefines a method that already exists on its parent,
    keeping the same name (Dog.speak() above). JavaScript supports this natively.

    OVERLOADING: having multiple versions of the SAME-named method that differ
    only by parameter list (e.g. add(a, b) and add(a, b, c) as two separate
    definitions). Some languages (Java, C++) support this directly.

  DOES JAVASCRIPT SUPPORT REAL METHOD OVERLOADING? No.

  */

  class MathHelperBroken {
    add(a, b) {
      return a + b;
    }
    // This SECOND definition doesn't create a second version —
    // it just OVERWRITES the first one. JS functions are values bound to a name.
    add(a, b, c) {
      return a + b + c;
    }
  }
  const brokenHelper = new MathHelperBroken();
  console.log('add(1, 2) after redefinition:', brokenHelper.add(1, 2)); // NaN — c is undefined!

  // To fake overload-like behavior, check arguments manually instead:
  class MathHelperFixed {
    add(a, b, c) {
      if (c === undefined) return a + b;
      return a + b + c;
    }
  }
  const fixedHelper = new MathHelperFixed();
  console.log('add(1, 2):', fixedHelper.add(1, 2)); // 3
  console.log('add(1, 2, 3):', fixedHelper.add(1, 2, 3)); // 6

  /*

  DUCK TYPING — polymorphism without a formal type system:

  "If it walks like a duck and quacks like a duck, it's a duck." In JavaScript,
  an object doesn't need to formally declare that it implements some interface —
  if it HAS the method being called, it works, no matter its actual class or
  where it came from.

  */

  // Two completely UNRELATED objects — neither extends Animal, neither knows
  // the other exists — but both work fine in a loop that just calls .speak().
  const robotDog = { speak: () => 'BEEP BOOP (robot dog noises)' };
  const parrot = { speak: () => 'Polly wants a cracker' };

  for (const thing of [robotDog, parrot]) {
    console.log(thing.speak());
  }
  // Neither of these is an Animal subclass — polymorphism worked anyway,
  // because JS only cares whether the method exists, not the object's ancestry.

  console.log('--- done: polymorphism = same call, type-specific behavior ---');
}
