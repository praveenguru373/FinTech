export interface CinematicSceneState {
  progress: number;
  persona: number;
  dimension: string;
}

export default function CinematicWorld({ scene, mobile, reducedMotion }: {
  scene: React.RefObject<CinematicSceneState>;
  mobile: boolean;
  reducedMotion: boolean;
}) {
  return <div
    className={`cinematic-scene${mobile ? " is-mobile" : ""}${reducedMotion ? " is-reduced-motion" : ""}`}
    data-scene-phase={Math.round((scene.current?.progress ?? 0) * 100)}
    aria-hidden="true"
  >
    <div className="cinematic-scene-grid" />
    <div className="cinematic-scene-beam" />
    <div className="cinematic-scene-panel cinematic-scene-panel-back">
      <span />
      <svg viewBox="0 0 520 260" role="presentation">
        <path d="M0 220 C72 211 100 181 156 190 S241 133 289 150 S374 106 425 112 S481 61 520 39" />
      </svg>
    </div>
    <div className="cinematic-scene-panel cinematic-scene-panel-front">
      <i /><i /><i />
    </div>
  </div>;
}
