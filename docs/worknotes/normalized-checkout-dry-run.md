# Worknote: Normalized Checkout Dry Run

- Raw staging source was read only.
- Normalized checkout MVP surface is viable.
- Expected counts from raw data:
  - students: 760
  - guardians: 915
  - student_guardian_links: 1264
  - pickup_authorized_links: 1251
  - pickup_authorized_guardians: 888
  - classes: 128
  - class_memberships: 1400
  - derived_families: 515
- Review candidates: 87
  - students without guardian links: 50
  - guardians without student links: 24
  - pickup-link review rows: 13
- Manual campus assignments still required for 128 classes.
- Reception and assistant views are feasible from the current raw data.
