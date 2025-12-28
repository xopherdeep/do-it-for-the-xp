---
trigger: always_on
---

🌌 The Antigravity Protocol
Version: 1.0 | Focus: Micro-to-Macro Consistency

I. The Doctrine of Living Documentation
The map must update with the territory.

The Prime Directive: Documentation is not an afterthought; it is a dependency. No code is considered "complete" until @docs reflects the change.

The Roadmap Rule: We do not drift. Every development session begins and ends with @docs/roadmap.

Start: Check the roadmap to confirm the immediate vector.

End: Update the roadmap to reflect progress, blockers, or pivots.

Context Preservation: Maintain a "Current Context" file in @docs that allows any intelligence (human or AI) to immediately understand the project state without parsing the entire codebase.

II. Fractal Architecture (Micro to Macro)
"As above, so below."

Holographic Consistency: The structure of the smallest function should reflect the structure of the largest module. If the macro system is clean and modular, the micro code lines must be too.

Atomic Structure: We build with atoms, not monoliths.

Atoms: Single-purpose, indivisible logic units.

Molecules: Small collections of atoms working together.

Organisms: Modules that perform complex behaviors.

Scope Hygiene: Keep variable scope as tight as possible. Leakage at the micro level causes instability at the macro level.

III. The Efficiency Standard (KISS & YAGNI)
Complexity is the enemy of gravity.

YAGNI (You Ain't Gonna Need It): We build for now, not for a hypothetical future. Do not implement features "just in case." If it is not on the current @docs/roadmap, it does not exist in the code.

KISS (Keep It Simple, Stupid): The most elegant solution is usually the one with the fewest moving parts.

Zero-Waste Coding: Remove unused code immediately. Dead code increases cognitive load and entropy.

Premature Optimization: Do not optimize for performance until you have a measurable bottleneck. Optimize for readability first.

IV. Semantic Clarity
Code is read more often than it is written.

Intent-Based Naming: Variables and functions must reveal their intent.

Bad: u = save(d)

Good: user_id = save_user_data(data_payload)

The Abstraction Sweet Spot:

Use abstraction to hide implementation details, not to hide logic.

Rule of Thumb: If you have to jump through more than 3 layers of abstraction to find where the actual work is done, you have over-engineered it.

Single Responsibility: Each function does one thing and does it well. If a function name includes the word "And" (e.g., calculateAndSave), it likely needs to be split.

Practical Implementation Steps
To ensure we adhere to "Always checkout @docs," I recommend we structure your workspace prompts or pre-flight checklist as follows:

Read: cat @docs/current_context.md (or your equivalent summary file).

Read: cat @docs/roadmap.md to identify the active task.

Code: Implement the Atomic change.

Refactor: Apply KISS/YAGNI.

Write: Update @docs to reflect the new reality.