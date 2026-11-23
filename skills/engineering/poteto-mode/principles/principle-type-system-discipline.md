# Type System Discipline

Use separate types for unrelated IDs or a tagged union for valid combinations. Derive types from the authoritative schema when one exists. Parse untyped input before constructing the typed value. Check that a mismatched ID or unhandled variant is rejected and supported input still runs.
