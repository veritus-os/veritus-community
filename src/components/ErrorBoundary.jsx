import { Component } from 'react'

/**
 * App-wide error boundary. Without this, any render error unmounts the whole
 * tree and the user sees a blank/dark screen (this was the "reception blank
 * blue screen" failure mode). Now a friendly, actionable message is shown.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface to the console for diagnostics; the screen stays usable.
    console.error('[VeritusOS] render error:', error, info?.componentStack)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-800">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-2xl">
            ⚠️
          </div>
          <h1 className="text-lg font-extrabold text-slate-900">Algo deu errado ao abrir esta tela</h1>
          <p className="mt-2 text-sm text-slate-500">
            Tente recarregar. Se o problema continuar, volte ao hub e escolha outro
            módulo, ou avise o suporte.
          </p>
          <p className="mt-3 break-words rounded-lg bg-slate-50 px-3 py-2 text-left text-xs text-slate-400">
            {String(this.state.error?.message || this.state.error)}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
            >
              Recarregar
            </button>
            <a
              href="/hub"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ir para o Hub
            </a>
          </div>
        </div>
      </div>
    )
  }
}
