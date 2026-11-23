# Feature

Name the action the user will take and the result they should observe. Trace data ownership and callers. Sketch a new interface where one is needed, then choose the smallest slice that exercises the full path.

Identify prerequisites and independent write targets before parallel work. Keep one owner for a coherent small change. Run the new behavior and the existing caller most likely to regress. Report what each check observed.
