import { useState } from "react";

const INITIAL = { age: 25, sex: "F", major: "", gpa: "", choice: "" };

export default function InputForm({ onSubmit, loading }) {
  const [form, setForm] = useState(INITIAL);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      age: Number(form.age),
      gpa: form.gpa === "" ? null : Number(form.gpa),
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
      <label>
        나이
        <input type="number" value={form.age} onChange={(e) => update("age", e.target.value)} />
      </label>
      <label>
        성별
        <select value={form.sex} onChange={(e) => update("sex", e.target.value)}>
          <option value="F">여성</option>
          <option value="M">남성</option>
        </select>
      </label>
      <label>
        전공 계열
        <input value={form.major} onChange={(e) => update("major", e.target.value)} />
      </label>
      <label>
        학점 (선택)
        <input type="number" step="0.01" value={form.gpa} onChange={(e) => update("gpa", e.target.value)} />
      </label>
      <label>
        가정할 진로 선택
        <input
          value={form.choice}
          placeholder="예: 대학원 진학"
          onChange={(e) => update("choice", e.target.value)}
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "분석 중..." : "평행우주 보기"}
      </button>
    </form>
  );
}
