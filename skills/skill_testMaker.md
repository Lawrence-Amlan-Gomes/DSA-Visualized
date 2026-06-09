# skill_testMaker

## Trigger

User prompts `@skill/testMaker.md` (or mentions "testMaker skill").

## What it means

The user wants to generate a comprehensive set of 100 test cases for the algorithm they are currently implementing in `practice.js`. This follows the specific pattern of 100 tests with success/failure emojis and a helper `test` function.

## Behavior

When triggered, the AI should:

1. **Research**: Read `practice.js` to understand the problem statement, the method signature (e.g., `eraseOverlapIntervals(intervals)`), and extract the filename from the first line (e.g., `// nonOverlappingIntervals.js`).
2. **Generate**: Create 100 diverse test cases. Use a sub-agent (like `generalist`) if needed to ensure variety.
3. **Helper Function**: Ensure a `test` helper function exists at the end of the `run()` function. It should track failures and only log `❌ Failed` cases. It MUST temporarily silence `console.log` while the test is running to prevent internal algorithm logs from cluttering the console. If all cases pass, it should log `✅ All success` at the end.
4. **Implementation**: Append the 100 test cases to a new section `// --- 100 Test Cases Batch (Silent on Success) ---` inside the `run()` function of `practice.js`.
   - **Reporting Pattern**:
     ```js
     // --- 100 Test Cases Batch (Silent on Success) ---
     let failures = 0;
     const test = (num, input, expected) => {
       const originalLog = console.log;
       console.log = () => {}; // Silence internal logs
       const result = solution.method(input);
       console.log = originalLog; // Restore logging

       if (result !== expected) {
         failures++;
         console.log(`${num}: ❌ Failed (Expected ${expected}, Got ${result})`);
       }
     };
     // ... tests ...
     if (failures === 0) console.log("✅ All success");
     ```
5. **File Creation**: 
   - Create a new file using the filename extracted in step 1.
   - Copy the entire updated content from `practice.js` into this new file.
6. **Manifest Sync & Report**: 
   - Execute `@skill/skill_newJsDsaFileCreated.md` to regenerate `manifest.json`, confirm the registered files, and notify the user about the sidebar update.
7. **Verify**: Check that all test cases are correctly formatted and the function name matches.
## Scope

- Touches: `practice.js` (or the active DSA solution file)
- Off-limits: Infrastructure files (`generate-manifest.js`, `server.js`, `index.html`), other solution files unless specified.

## Edge cases

- **No // Test Cases: section**: Create it if it's missing at the end of the `run()` function.
- **Method name mismatch**: Always verify the method name from the `Solution` class before generating test calls.
- **Complex inputs**: For problems with multiple parameters, adapt the `test` helper and calls accordingly.

## Boundaries

- Do NOT overwrite existing code in the `Solution` class.
- Do NOT add external dependencies.
- Do NOT commit or push the changes.

## Example

User: `@skill/testMaker.md`
Claude: Reads `practice.js`, identifies `Solution.threeSum(nums)`, generates 100 tests, appends them to `practice.js` with the tick/cross logging format.
