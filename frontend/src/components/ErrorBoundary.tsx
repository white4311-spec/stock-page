import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(e: Error): State {
    return { hasError: true, message: e.message }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 12, color: 'var(--muted)', fontSize: 11, background: 'var(--card)', borderRadius: 6, border: '1px solid var(--border)' }}>
          ⚠ 차트 렌더링 오류: {this.state.message.slice(0, 80)}
          <button onClick={() => this.setState({ hasError: false, message: '' })}
            style={{ marginLeft: 8, fontSize: 10, cursor: 'pointer', background: 'var(--border)', border: 'none', color: 'var(--text)', borderRadius: 3, padding: '1px 6px' }}>
            재시도
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
