# Worknote: Safe Git Workflow

- use short-lived branches per feature area
- keep migrations grouped by functional layer
- commit docs separately from schema changes when possible
- never push automatically
- keep rollback limited to migration reversal, not data deletion
