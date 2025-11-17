console.log("Before importing testApi:");
console.log("process.env.VITEST:", process.env.VITEST);
console.log("process.env.NODE_ENV:", process.env.NODE_ENV);

// Simulate what the test does
process.env.NODE_ENV = "production";
if (process.env.VITEST !== undefined) {
  delete process.env.VITEST;
}

console.log("\nAfter manual env changes:");
console.log("process.env.VITEST:", process.env.VITEST);
console.log("process.env.VITEST === undefined:", process.env.VITEST === undefined);
console.log("typeof process.env.VITEST:", typeof process.env.VITEST);

const checkVITEST = () => {
  if (typeof process !== "undefined") {
    if (process.env?.VITEST) return true;
  }
  return false;
};

console.log("checkVITEST result:", checkVITEST());
