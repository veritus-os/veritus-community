# Worknote: Checkout System MVP

- Checkout MVP remains separate from the full ERP rollout.
- Existing `students`, `guardians`, and `families` tables are reused.
- Checkout-specific tables remain the operational source of truth for dismissal.
- Families are derived conservatively from explicit guardian links.
