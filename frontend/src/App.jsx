import { Routes, Route, Navigate } from "react-router-dom";
import { useResult } from "./data/ResultContext.jsx";
import Layout from "./components/Layout.jsx";
import Landing from "./screens/Landing.jsx";
import Onboarding from "./screens/Onboarding.jsx";
import InputScreen from "./screens/InputScreen.jsx";
import Simulate from "./screens/Simulate.jsx";
import Result from "./screens/Result.jsx";
import Archive from "./screens/Archive.jsx";
import HomeHub from "./screens/HomeHub.jsx";
import MyUniverse from "./screens/MyUniverse.jsx";
import Settings from "./screens/Settings.jsx";

// "/" 진입점 — 첫 로그인이면 랜딩, 이미 온보딩했으면 홈으로.
function Entry() {
  const { onboarded } = useResult();
  return onboarded ? <Navigate to="/home" replace /> : <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Entry />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/home" element={<HomeHub />} />
        <Route path="/input" element={<InputScreen />} />
        <Route path="/simulate" element={<Simulate />} />
        <Route path="/result" element={<Result />} />
        <Route path="/my" element={<MyUniverse />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
