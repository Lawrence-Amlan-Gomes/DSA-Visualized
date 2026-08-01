// oop-compositionVsInheritance.js
// Phase 0.5, Section 4 — Composition vs. Inheritance: "has-a" instead of "is-a".
export default function run() {
  /*

  Instead of a class BEING a more specific version of another class,
  COMPOSITION builds a class out of smaller pieces it HAS.

  A Car doesn't have to inherit from Engine — it can just HAVE an Engine
  as a field, and delegate work to it.

  */

  class Engine {
    constructor(horsepower) {
      this.horsepower = horsepower;
    }
    start() {
      return `Engine (${this.horsepower}hp) running`;
    }
  }

  class ElectricEngine {
    start() {
      return 'Electric motor humming silently';
    }
  }

  class Car {
    constructor(engine) {
      this.engine = engine; // Car HAS an Engine — composition, not inheritance
    }
    start() {
      return this.engine.start(); // delegate the work to the piece that owns it
    }
  }

  const gasCar = new Car(new Engine(300));
  const electricCar = new Car(new ElectricEngine());

  console.log(gasCar.start()); // "Engine (300hp) running"
  console.log(electricCar.start()); // "Electric motor humming silently"

  // Notice: Car's class definition never changed. Swapping gas for electric was
  // just handing it a DIFFERENT OBJECT at construction time. With inheritance
  // (an "ElectricCar extends Car" subclass), that choice would be baked in at
  // class-definition time instead — fixed, not swappable.

  // You can even swap an engine on an EXISTING car, at runtime:
  const car = new Car(new Engine(150));
  console.log('Before swap:', car.start());
  car.engine = new ElectricEngine();
  console.log('After swap: ', car.start());

  /*

  INHERITANCE vs. COMPOSITION, side by side:

    Relationship   | Inheritance: subclass IS a kind of parent
                   | Composition: object HAS another object as a part
    Flexibility    | Inheritance: fixed once the class is written
                   | Composition: parts can be swapped, even at runtime (see above)
    Coupling       | Inheritance: tight — subclass depends on parent's internals
                   | Composition: loose — only depends on the part's public interface
    Good for       | Inheritance: a genuinely stable taxonomy, 1-2 levels deep
                   | Composition: mixing and matching pluggable behavior

  WHY "favor composition" as a default: swapping Car's engine took ONE line
  and zero class changes. The inheritance equivalent means every layer of
  inherited behavior comes along whether you want it or not (see the
  speakCount surprise in oop-inheritance.js).

  SO IS INHERITANCE EVER THE RIGHT CALL? Yes — when the relationship is truly
  "is-a", genuinely stable, and shallow (one, maybe two levels). The moment
  you're inheriting just to reuse a method, or reaching for a 3rd/4th level
  to express "a mix of behaviors," that's usually a sign composition fits better.

  */

  // One more composition example: building a "Duck" out of swappable behaviors
  // instead of forcing every duck into one rigid inheritance tree.
  const canQuack = { makeSound: () => 'Quack!' };
  const canSqueak = { makeSound: () => 'Squeak! (rubber duck)' };

  function createDuck(name, soundBehavior) {
    return {
      name,
      speak() {
        return `${name}: ${soundBehavior.makeSound()}`;
      },
    };
  }

  const realDuck = createDuck('Donald', canQuack);
  const toyDuck = createDuck('Squeaky', canSqueak);
  console.log(realDuck.speak());
  console.log(toyDuck.speak());
  // Same "shape" (both have .speak()), completely different behavior plugged in —
  // no shared parent class needed at all.

  console.log('--- done: "is-a" → inheritance, "has-a" → composition ---');
  console.log('--- when unsure, composition is the safer default ---');
}
