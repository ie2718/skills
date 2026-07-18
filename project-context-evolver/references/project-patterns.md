# Proven Project Context Patterns

These patterns are generalized from a mature local-first Agent workspace. Apply them only when they fit the target repository.

## 1. Fast onboarding path

Provide a short ordered reading path instead of asking every agent to read the whole repository:

1. Primary instruction file
2. Context index
3. README for setup/runtime
4. Architecture for boundaries
5. PRD only when product scope matters

This reduces startup cost while keeping deeper sources discoverable.

## 2. Truth classification

Separate documents into:

- **Authoritative:** current rules, scope, architecture, accepted decisions
- **Supporting:** schemas, type definitions, package manifests
- **Historical:** discussions, prototypes, prior reviews, development logs
- **Planned:** approved specs that are not yet implemented

Agents make fewer mistakes when they know not only where information lives, but what authority it has.

## 3. Explicit baseline invariants

State compatibility requirements as testable invariants. A useful pattern is:

> With feature X disabled, the established baseline behavior remains unchanged.

This is stronger than “avoid regressions” because it names the configuration and expected baseline. Pair it with a focused test when possible.

## 4. Plan, progress, and decision separation

Use different owners for different questions:

- Plan: what should be built and how it will be accepted
- Progress ledger: what has completed, what is blocked, and how to resume
- Decision log: why a durable choice was made
- Development log: why a completed milestone matters

Combining all four into one growing document makes status and rationale difficult to trust.

## 5. Local data boundary

For local-first systems, document data flow in boundary language:

- where raw files live
- which paths may be exposed externally
- which stores contain credentials
- which logs exclude bodies or secrets
- which actions require confirmation

“Local-first” is too vague unless the context explains the actual storage and exposure rules.

## 6. Capability and implementation separation

Keep product-level roles separate from the runtime or provider that executes them. In project context, describe:

- the stable capability/role contract
- the selectable backend or provider
- the permission and artifact boundary
- provenance that must be preserved

This prevents a tool integration from being mistaken for the product architecture itself.

## 7. Minimal UI and prompt guidance

Record product principles only when they constrain implementation. Good examples:

- visible copy should serve the user's current goal
- prompts should prefer current user input and explicit facts over large default templates
- advanced configuration stays collapsed until selected

Avoid subjective design slogans that do not guide a future change.

## 8. File-size and maintenance ratchets

If a repository has size limits or temporary baselines, state the ratchet:

- new files must stay under the normal limit
- legacy exceptions may only decrease
- generated files are excluded or have a separate rule

This turns a guideline into a measurable maintenance policy.

## 9. Context update triggers in the done definition

Make context maintenance part of completion:

- commands/layout/rules changed -> update primary instructions
- modules/data flow changed -> update architecture
- significant choice changed -> update decisions
- meaningful milestone completed -> update development log

Do not update context after trivial changes. The trigger should be durable knowledge, not activity volume.
