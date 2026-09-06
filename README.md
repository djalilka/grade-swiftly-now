# Quick Grade AI

Build a minimal web app called "TashihAI". No login, no accounts, no database. It does exactly one thing:



## CORE FLOW

1. Two upload fields on one simple page:

   - "Student's Answer Sheet" (image upload — photo or scan)

   - "Correction/Answer Key Sheet" (image upload — photo or scan)

2. A single button: "Grade" / "تصحيح"

3. When clicked, the system reads both images using OCR (must support both Arabic and French handwriting/text), compares the student's answers against the answer key question by question, and calculates a final score.

4. Display ONLY the result: total score (e.g., "14/20"). No breakdown, no explanations, no per-question detail — just the final number.



## SCOPE — STRICT MINIMUM

- No rubric builder, no manual point assignment — the answer key sheet itself defines the correct answers and their point values (assume the key sheet shows this clearly, e.g., "Q1: [answer] (2 pts)").

- No batch upload, no history, no saved sessions — one comparison at a time.

- No user accounts, no persistent storage — everything happens in a single session in memory.



## DESIGN

- One clean page, Arabic UI (RTL), minimal steps: upload → upload → click → see result.

- No extra screens or navigation.



## BUILD NOTE

Keep the OCR + comparison logic in a clearly isolated function/module, since it will likely need to be swapped for a stronger AI model via API once basic accuracy is tested.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c58c2512-a55d-4c2f-bc35-5d200b27686c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
