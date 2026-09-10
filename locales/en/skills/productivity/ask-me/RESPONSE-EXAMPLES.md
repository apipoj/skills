## Response Shapes

The shapes below are the numbered-list fallback for a host without a structured choice prompt.

### Interview Turn

```markdown
### คำถาม <n>: <decision เดียว>

<เหตุผลหนึ่งประโยคว่า decision นี้เปลี่ยนอะไร>

**ผมแนะนำ:** <คำตอบที่แนะนำ> — <เหตุผลหรือ tradeoff สั้น ๆ>

<ถ้าจำเป็น: 2–3 ตัวเลือกที่ต่างกันจริง>
ตอบ `ตามนี้` หรือเลือกทางอื่นได้เลย
```

Never hide multiple questions in one sentence or bullet.

### Confirmation

```markdown
## สรุป
- **เป้าหมาย:**
- **ผู้ใช้ / ปัญหา:**
- **Audience / decision:**
- **ตัดสินใจแล้ว:**
- **ขอบเขต / ไม่ทำ:**
- **ข้อจำกัด / tradeoffs:**
- **วัดผล:**
- **ยังเปิดอยู่:**

ตรงไหม? ถ้าตรงตอบ `ยืนยัน`; ถ้าไม่ตรงบอกจุดเดียวที่ต้องแก้
```

Accept an unambiguous equivalent such as `ตรงแล้ว` or `ตามนี้`. If the user stops early,
return only settled decisions and open branches, then stop.
