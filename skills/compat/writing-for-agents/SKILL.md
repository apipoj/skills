---
name: writing-for-agents
description: ชื่อจาก upstream สำหรับ write-skills; แจ้งชื่อหลักแล้วใช้ contract เดียวกันโดยไม่เพิ่มสิทธิ์หรือขยาย scope
disable-model-invocation: true
---
# ชื่อ upstream: writing-for-agents

`writing-for-agents` คือชื่อของ skill นี้ในต้นทาง Matt Pocock ส่วนชื่อหลักใน Apipoj Skills คือ `write-skills` ใช้ได้ถึงก่อน version 6.0.0 ให้บอกผู้ใช้ว่าชื่อหลักคืออะไร แล้วทำตาม approval และ evidence contract เดิม

## Workflow

1. แจ้งชื่อหลัก `write-skills`
2. ใช้ contract ของ write-skills โดยไม่เพิ่มสิทธิ์หรือขยาย scope

## Evidence Receipt

คืน receipt ของ workflow หลักและเพิ่ม `compat_alias: writing-for-agents`

## Guardrails

- ห้ามเพิ่ม scope หรือสิทธิ์ผ่าน alias
- ห้ามซ่อนคำแจ้งชื่อหลัก
