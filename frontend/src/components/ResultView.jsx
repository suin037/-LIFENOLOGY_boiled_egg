export default function ResultView({ result }) {
  const { expected_wage, causal_effect, survival_months, neighbors, narrative } = result;

  return (
    <section style={{ marginTop: "2rem", borderTop: "1px solid #ddd", paddingTop: "1rem" }}>
      <h2>평행우주의 나</h2>
      {narrative && <p style={{ fontStyle: "italic" }}>{narrative}</p>}

      <ul>
        <li>예상 월급: {Math.round(expected_wage).toLocaleString()}원</li>
        <li>선택의 인과효과: {Math.round(causal_effect).toLocaleString()}</li>
        <li>예상 재직기간: {survival_months.toFixed(1)}개월</li>
      </ul>

      {neighbors?.length > 0 && (
        <>
          <h3>비슷한 사례</h3>
          <ul>
            {neighbors.map((n, i) => (
              <li key={i}>
                유사도 {n.similarity.toFixed(2)} · {n.job_category ?? "-"} ·{" "}
                {n.monthly_wage ? `${Math.round(n.monthly_wage).toLocaleString()}원` : "-"}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
