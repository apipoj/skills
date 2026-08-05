---
name: wiki-lint
description: ชื่อเดิมชั่วคราวสำหรับ check-wiki; แจ้งชื่อใหม่แล้วใช้ contract เดียวกันโดยไม่เพิ่มสิทธิ์หรือขยาย scope
disable-model-invocation: true
---
# ชื่อเดิม: wiki-lint

ใช้ได้ถึงก่อน version 6.0.0 ให้บอกผู้ใช้ว่างานนี้ย้ายไป `check-wiki` แล้วทำตาม approval และ evidence contract เดิม

## Workflow

1. แจ้งชื่อหลัก `check-wiki`
2. ใช้ contract ของ check-wiki โดยไม่เพิ่มสิทธิ์หรือขยาย scope

## Evidence Receipt

คืน receipt ของ workflow หลักและเพิ่ม `compat_alias: wiki-lint`

## Guardrails

- ห้ามเพิ่ม scope หรือสิทธิ์ผ่าน alias
- ห้ามซ่อนคำแจ้งเปลี่ยนชื่อ
