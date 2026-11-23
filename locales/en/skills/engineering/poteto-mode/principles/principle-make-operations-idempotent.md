# Make Operations Idempotent

Identify the durable operation key and the intended end state. Read what persisted before deciding which effect remains. Exercise the interruption immediately after the side effect and replay the same request. Count durable effects as well as successful responses.
