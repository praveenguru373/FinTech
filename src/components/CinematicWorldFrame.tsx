import { Component, lazy, Suspense } from "react";
import type { ErrorInfo, ReactNode } from "react";
import type { CinematicSceneState } from "./CinematicWorld";

const CinematicWorld = lazy(() => import("./CinematicWorld"));

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Cinematic 3D scene failed; using the static visual fallback.", error, info.componentStack);
  }

  render(): ReactNode {
    return this.state.failed
      ? <div className="world-static-fallback" aria-hidden="true" />
      : this.props.children;
  }
}

export function CinematicWorldFrame({ scene, mobile, reducedMotion }: { scene: React.RefObject<CinematicSceneState>; mobile: boolean; reducedMotion: boolean }) {
  return <SceneErrorBoundary>
    <Suspense fallback={<div className="world-static-fallback" aria-hidden="true" />}>
      <CinematicWorld scene={scene} mobile={mobile} reducedMotion={reducedMotion} />
    </Suspense>
  </SceneErrorBoundary>;
}
