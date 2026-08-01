// oop-solidPrinciples.js
// Phase 0.5, Section 6 — SOLID: five design principles interviewers use to check
// whether you can reason about maintainable class design, not just get code to run.
export default function run() {
  /*
   S — SINGLE RESPONSIBILITY PRINCIPLE
   A class should have exactly ONE reason to change — one job.
  */

  // VIOLATES IT: one class does pay math, saving, AND report formatting —
  // three unrelated reasons this class would ever need to change.
  class EmployeeBad {
    constructor(name, hoursWorked, hourlyRate) {
      this.name = name;
      this.hoursWorked = hoursWorked;
      this.hourlyRate = hourlyRate;
    }
    calculatePay() {
      return this.hoursWorked * this.hourlyRate;
    }
    saveToDatabase() {
      console.log(`[DB] saving ${this.name}'s record...`);
    }
    printReport() {
      console.log(`[REPORT] ${this.name}: $${this.calculatePay()}`);
    }
  }

  // FIXES IT: split into three focused classes, each with one job.
  class PayCalculator {
    static calculate(hoursWorked, hourlyRate) {
      return hoursWorked * hourlyRate;
    }
  }
  class PayRepository {
    static save(employeeName, amount) {
      console.log(`[DB] saving ${employeeName}: $${amount}`);
    }
  }
  class PayReportPrinter {
    static print(employeeName, amount) {
      console.log(`[REPORT] ${employeeName}: $${amount}`);
    }
  }

  const pay = PayCalculator.calculate(40, 25);
  PayRepository.save('Lawrence', pay);
  PayReportPrinter.print('Lawrence', pay);
  // A pay-rule change now only touches PayCalculator. A report-format change
  // now only touches PayReportPrinter. Neither can accidentally break the other.

  /*
   O — OPEN/CLOSED PRINCIPLE
   Classes should be open for EXTENSION, closed for MODIFICATION.
   Add new behavior by adding new code, not by editing tested code every time.
  */

  // VIOLATES IT: this function needs a new "else if" — and a re-test of the
  // WHOLE function — every time a new shape shows up.
  function calculateAreaBad(shape) {
    if (shape.type === 'circle') return Math.PI * shape.radius ** 2;
    else if (shape.type === 'square') return shape.side ** 2;
    // adding "triangle" means editing this function again...
    return 0;
  }
  console.log('Bad circle area:', calculateAreaBad({ type: 'circle', radius: 2 }).toFixed(2));

  // FIXES IT: each shape knows how to compute its OWN area. calculateArea()
  // never changes again, no matter how many shapes get added.
  class Circle {
    constructor(radius) {
      this.radius = radius;
    }
    area() {
      return Math.PI * this.radius ** 2;
    }
  }
  class Square {
    constructor(side) {
      this.side = side;
    }
    area() {
      return this.side ** 2;
    }
  }
  class Triangle {
    constructor(base, height) {
      this.base = base;
      this.height = height;
    }
    area() {
      return 0.5 * this.base * this.height;
    }
  }
  function calculateAreaGood(shape) {
    return shape.area(); // never edited again when a new shape class shows up
  }
  for (const shape of [new Circle(2), new Square(3), new Triangle(4, 5)]) {
    console.log(`${shape.constructor.name} area:`, calculateAreaGood(shape).toFixed(2));
  }

  /*
   L — LISKOV SUBSTITUTION PRINCIPLE
   A subclass should be usable anywhere its parent is expected, without
   breaking the caller's assumptions.
  */

  // CLASSIC VIOLATION: Square "is-a" Rectangle geometrically, but forcing that
  // relationship in code breaks an assumption every Rectangle caller relies on —
  // that width and height are independent.
  class Rectangle {
    setWidth(w) {
      this.width = w;
    }
    setHeight(h) {
      this.height = h;
    }
    area() {
      return this.width * this.height;
    }
  }
  class SquareBroken extends Rectangle {
    setWidth(w) {
      this.width = w;
      this.height = w; // secretly changes height too, to "stay square"
    }
    setHeight(h) {
      this.width = h;
      this.height = h;
    }
  }

  function testRectangle(rect) {
    rect.setWidth(5);
    rect.setHeight(10);
    // ANY code written against Rectangle is entitled to expect this:
    console.log('Expected area 50, got:', rect.area());
  }
  testRectangle(new Rectangle()); // "Expected area 50, got: 50" — correct
  testRectangle(new SquareBroken()); // "Expected area 50, got: 100" — SILENTLY WRONG
  // SquareBroken is NOT a safe drop-in replacement for Rectangle, even though
  // "a square is a rectangle" sounds true in geometry class.

  /*
   I — INTERFACE SEGREGATION PRINCIPLE
   Don't force a class to implement methods it doesn't need. Prefer several
   small, specific interfaces over one large, general-purpose one.
  */

  // VIOLATES IT: one fat "Worker" contract forces EVERY worker to implement
  // eat(), even a robot that has no business eating.
  class RobotWorkerBad {
    work() {
      return 'welding...';
    }
    eat() {
      throw new Error('Robots do not eat!'); // forced to implement something meaningless
    }
  }

  // FIXES IT: split into small, specific roles — implement only what applies.
  const Workable = {
    work() {
      return `${this.name} is working`;
    },
  };
  const Eatable = {
    eat() {
      return `${this.name} is eating lunch`;
    },
  };

  class RobotWorkerGood {
    constructor(name) {
      this.name = name;
    }
  }
  Object.assign(RobotWorkerGood.prototype, Workable); // only gets work(), no eat()

  class HumanWorker {
    constructor(name) {
      this.name = name;
    }
  }
  Object.assign(HumanWorker.prototype, Workable, Eatable); // gets both

  console.log(new RobotWorkerGood('R2').work());
  console.log(new HumanWorker('Sam').work());
  console.log(new HumanWorker('Sam').eat());
  // RobotWorkerGood is never forced to have a meaningless eat() method at all.

  /*
   D — DEPENDENCY INVERSION PRINCIPLE
   High-level code should depend on an ABSTRACTION, not a specific low-level
   implementation.
  */

  // VIOLATES IT: this class creates its OWN concrete database inside itself.
  // It can never be tested without a real MySQL connection, and can never
  // swap databases without editing this class's source code.
  class MySQLDatabase {
    save(record) {
      console.log('[MySQL] saved', record);
    }
  }
  class UserServiceBad {
    constructor() {
      this.db = new MySQLDatabase(); // hardcoded dependency — tightly coupled
    }
    createUser(name) {
      this.db.save({ name });
    }
  }

  // FIXES IT: accept the dependency through the constructor instead of
  // creating it internally — this is called DEPENDENCY INJECTION.
  class FakeDatabase {
    save(record) {
      console.log('[FAKE/TEST] saved', record, '(no real DB touched)');
    }
  }
  class UserServiceGood {
    constructor(db) {
      this.db = db; // UserServiceGood only depends on "db has a .save() method"
    }
    createUser(name) {
      this.db.save({ name });
    }
  }

  new UserServiceBad().createUser('Alice'); // always real MySQL, no way to swap it
  new UserServiceGood(new MySQLDatabase()).createUser('Bob'); // real DB in production
  new UserServiceGood(new FakeDatabase()).createUser('Carol'); // fake DB in a test — no code changes needed

  console.log('--- done: S-O-L-I-D — spot the violation, explain what breaks ---');
}
