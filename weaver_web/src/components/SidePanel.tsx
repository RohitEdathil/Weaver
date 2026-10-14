import { ConverserPanel } from './ConverserPanel'
import { VisualizerAgentPanel } from './VisualizerAgentPanel'
import './SidePanel.css'

export type PanelTab = 'converser' | 'visualizer'

interface Props {
  sessionId: string
  open: boolean
  tab: PanelTab
  onTabChange: (tab: PanelTab) => void
  visualizerRefresh: number
  onVisualizerInvoked: () => void
  onCanvasRefresh: () => void
}

export function SidePanel({
  sessionId,
  open,
  tab,
  onTabChange,
  visualizerRefresh,
  onVisualizerInvoked,
  onCanvasRefresh,
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
      </div>

      <div className="side-panel-body">
        <div className="side-panel-view" hidden={tab !== 'converser'}>
          <ConverserPanel
            sessionId={sessionId}
            onVisualizerInvoked={onVisualizerInvoked}
            onCanvasRefresh={onCanvasRefresh}
          />
        </div>
        <div className="side-panel-view" hidden={tab !== 'visualizer'}>
          <VisualizerAgentPanel
            sessionId={sessionId}
            refreshToken={visualizerRefresh}
            onCanvasUpdate={onCanvasRefresh}
          />
        </div>
      </div>
    </aside>
  )
}
