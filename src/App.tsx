import SurfaceExplorer from "./SurfaceExplorer";
import "./workspace.css";

type WorkspaceView = "mission" | "map";

function initialView(): WorkspaceView {
  return new URLSearchParams(window.location.search).get("view") === "map" ? "map" : "mission";
}

export default function App() {
  const view = initialView();
  const baseUrl = import.meta.env.BASE_URL;

  if (view === "map") {
    return <SurfaceExplorer />;
  }

  return (
    <main className="mission-workspace">
      <iframe
        className="mission-frame"
        src={`${baseUrl}mission-control/index.html`}
        title="ARES interactive 3D Mars mission control"
      />
    </main>
  );
}
