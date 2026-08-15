import { useState } from "react";
import AvatarStep from "./screens/AvatarStep.jsx";
import InputForm from "./components/InputForm.jsx";
import ResultView from "./components/ResultView.jsx";
import { DEFAULT_TOONHEAD } from "./data/toonHeadOptions.js";
import { avatarDataUri } from "./lib/renderAvatar.js";
import { predict } from "./api.js";

// 이 저장소는 예측 API 테스트 하네스라 라우터가 없다.
// 온보딩 아바타 단계를 확인할 수 있게 '아바타 단계 → 기존 화면' 순서로만 이어붙였다.
// 통합 UI 로 옮길 때는 AvatarStep 을 온보딩 라우트에 끼우고 이 파일은 버리면 된다.
export default function App() {
  const [avatar, setAvatar] = useState(DEFAULT_TOONHEAD);
  const [done, setDone] = useState(false);
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

  if (!done) {
    return (
      <AvatarStep
        value={avatar}
        onChange={setAvatar}
        onNext={(config) => {
          setAvatar(config);
          setDone(true);
        }}
      />
    );
  }

  return (
    <main className="mx-auto max-w-phone animate-fade px-5 pb-10 pt-6">
      <header className="flex items-center gap-3">
        <img
          src={avatarDataUri(avatar)}
          alt="내 아바타"
          width={52}
          height={52}
          className="block shrink-0 rounded-full border border-line bg-card"
        />
        <div>
          <h1 className="text-lg font-bold text-ink">parallel-me</h1>
          <p className="text-[11px] text-mut">다른 선택을 했다면, 평행우주의 나는?</p>
        </div>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="tap ml-auto rounded-full border border-line bg-card px-3 text-[11px] text-sub active:scale-95"
        >
          아바타 수정
        </button>
      </header>

      <div className="mt-5">
        <InputForm onSubmit={handleSubmit} loading={loading} />
        {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}
        {result && <ResultView result={result} />}
      </div>
    </main>
  );
}
