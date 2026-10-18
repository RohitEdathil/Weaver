import { ConverserPanel } from './ConverserPanel'
import { SavedCanvasesPanel } from './SavedCanvasesPanel'
import { VisualizerAgentPanel } from './VisualizerAgentPanel'
import type { SavedCanvas } from '../savedCanvases'
import './SidePanel.css'

export type PanelTab = 'converser' | 'visualizer' | 'saved'

interface Props {
  sessionId: string
  open: boolean
  tab: PanelTab
  onTabChange: (tab: PanelTab) => void
  visualizerRefresh: number
  onVisualizerInvoked: () => void
  onCanvasRefresh: () => void
  onRequestSnapshot: () => Promise<string>
  firebaseEnabled: boolean
  deviceId: string
  savedRefresh: number
  onArtifactLoaded: (artifact: SavedCanvas) => void
}

export function SidePanel({
  sessionId,
  open,
  tab,
  onTabChange,
  visualizerRefresh,
  onVisualizerInvoked,
  onCanvasRefresh,
  onRequestSnapshot,
  firebaseEnabled,
  deviceId,
  savedRefresh,
  onArtifactLoaded,
}: Props) {
  return (
    <aside className={`side-panel${open ? ' open' : ''}`}>
      <div className="side-panel-tabs" role="tablist" aria-label="Agent">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'converser'}
          className={tab === 'converser' ? 'active' : undefined}
          onClick={() => onTabChange('converser')}
        >
          Converser
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'visualizer'}
          className={tab === 'visualizer' ? 'active' : undefined}
          onClick={() => onTabChange('visualizer')}
        >
          Visualizer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'saved'}
          className={tab === 'saved' ? 'active' : undefined}
          onClick={() => onTabChange('saved')}
        >
          Saved
        </button>
      </div>

      <div className="side-panel-body">
        <div className="side-panel-view" hidden={tab !== 'converser'}>
          <ConverserPanel
            sessionId={sessionId}
            onVisualizerInvoked={onVisualizerInvoked}
            onCanvasRefresh={onCanvasRefresh}
            onRequestSnapshot={onRequestSnapshot}
          />
        </div>
        <div className="side-panel-view" hidden={tab !== 'visualizer'}>
          <VisualizerAgentPanel
            sessionId={sessionId}
            refreshToken={visualizerRefresh}
            onCanvasUpdate={onCanvasRefresh}
            onRequestSnapshot={onRequestSnapshot}
          />
        </div>
        <div className="side-panel-view" hidden={tab !== 'saved'}>
          <SavedCanvasesPanel
            sessionId={sessionId}
            firebaseEnabled={firebaseEnabled}
            deviceId={deviceId}
            refreshToken={savedRefresh}
            onArtifactLoaded={onArtifactLoaded}
          />
        </div>
      </div>
    </aside>
  )
}
