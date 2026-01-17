2026-01-17 - Error Grouping UI Pattern
Learning: When displaying time-series validation errors (like path collisions), grouping consecutive events of the same type is critical for usability. Users care about "I hit the wall here," not "I hit the wall at t=1.0, 1.1, 1.2...".
Action: Always implement aggregation logic for high-frequency validation events before displaying them in list views. Use expand/collapse patterns for the details.
