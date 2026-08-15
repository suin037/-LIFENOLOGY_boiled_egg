import { useState } from "react";
import Avatar from "./components/Avatar.jsx";
import AvatarBuilder from "./components/AvatarBuilder.jsx";
import InputForm from "./components/InputForm.jsx";
import ResultView from "./components/ResultView.jsx";
import { DEFAULT_AVATAR } from "./data/avatarOptions.js";
import { predict } from "./api.js";

// 이 저장소는 예측 API 테스트 하네스라 라우터가 없다.
// Avatar / AvatarBuilder 가 통합 UI 에서 쓰이는 모습(온보딩 한 스텝 안에 끼운 형태)을
// 확인해보려고 최소한으로만 감쌌다. 통합할 때 이 파일은 버리면 된다.
export default function App() {
  const [avatarConfig, setAvatarConfig] = useState(DEFAULT_AVATAR);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    <main className="mx-auto max-w-phone animate-fade px-5 pb-12 pt-6">
      <div className="mb-2 mt-1.5 text-[11px] font-semibold tracking-[3px] text-mut">
        나를 알려주세요 · 6/6
      </div>

      <label className="mb-2 block text-xs text-sub">
        내 아바타 만들기{" "}
        <span className="text-[10px] text-mut">· 나중에 설정에서 언제든 바꿀 수 있어요</span>
      </label>
      <AvatarBuilder config={avatarConfig} onChange={setAvatarConfig} />

      <div className="my-6 h-px bg-line" />

      <div className="flex items-center gap-3">
        <Avatar config={avatarConfig} size={52} />
        <div>
          <h1 className="text-base font-bold text-ink">parallel-me</h1>
          <p className="text-[11px] text-mut">다른 선택을 했다면, 평행우주의 나는?</p>
        </div>
      </div>

      <div className="mt-4">
        <InputForm onSubmit={handleSubmit} loading={loading} />
        {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}
        {result && <ResultView result={result} />}
      </div>
    </main>
  );
}
