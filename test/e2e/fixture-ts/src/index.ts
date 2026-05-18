// Deliberate type error for e2e testing
function add(a: number, b: number): number {
  return a + b;
}

// TS2345: Argument of type 'string' is not assignable to parameter of type 'number'
const result: number = add(1, "two");

export { result };
