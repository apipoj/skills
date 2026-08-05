---
name: code
description: ชื่อเดิมชั่วคราวสำหรับ implement; แจ้งชื่อใหม่แล้วใช้ contract เดียวกันโดยไม่เพิ่มสิทธิ์หรือขยาย scope
disable-model-invocation: true
---
# ชื่อเดิม: code

ใช้ได้ถึงก่อน version 6.0.0 ให้บอกผู้ใช้ว่างานนี้ย้ายไป `implement` แล้วทำตาม approval และ evidence contract เดิม

## Workflow

1. Disclose the canonical skill name.
2. Apply the implement contract directly without adding authority.

## Evidence Receipt

Return the canonical workflow receipt and include `compat_alias: code`.

## Guardrails

- Never broaden scope or permissions through an alias.
- Do not hide the deprecation notice.
