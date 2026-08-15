import { useState } from "react";
import ToonHeadBuilder from "./components/ToonHeadBuilder.jsx";
import { DEFAULT_TOONHEAD } from "./data/toonHeadOptions.js";
import InputForm from "./components/InputForm.jsx";
import ResultView from "./components/ResultView.jsx";
import { predict } from "./api.js";

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [avatar, setAvatar] = useState(DEFAULT_TOONHEAD);

  async function handleSubmit(input) {
    setLoading(true);
    setError(null);
    try {
      setResult(await predict(input));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>parallel-me</h1>
      <p>다른 선택을 했다면, 평행우주의 나는?</p>
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem" }}>내 아바타</h2>
        <ToonHeadBuilder config={avatar} onChange={setAvatar} />
      </section>
      <InputForm onSubmit={handleSubmit} loading={loading} />
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {result && <ResultView result={result} />}
    </main>
  );
}
