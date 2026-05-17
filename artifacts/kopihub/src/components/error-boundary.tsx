import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (e: unknown) => void;
  /** When true, renders the user-facing LayoutErrorFallback instead of silent null. */
  withFallback?: boolean;
};
type State = { hasError: boolean; error: unknown };

/**
 * Lightweight local ErrorBoundary.
 * - Default (no props): silent null fallback — useful to shield small widgets
 *   (e.g. notif banner) without disrupting the layout.
 * - withFallback: renders LayoutErrorFallback with retry button — use this when
 *   wrapping page-level <Outlet /> in shell layouts (pos-app, admin, kurir, akun,
 *   /s/$slug) so a broken child page does not blank out the nav shell.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    if (this.props.onError) this.props.onError(error);
    // eslint-disable-next-line no-console
    console.warn("[ErrorBoundary] caught:", error);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    if (this.props.withFallback) {
      return <LayoutErrorFallback error={this.state.error} onRetry={this.reset} />;
    }
    return null;
  }
}

function LayoutErrorFallback({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Halaman gagal dimuat</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Terjadi kesalahan saat menampilkan halaman ini. Anda masih bisa berpindah ke menu lain di samping.
        </p>
        {import.meta.env.DEV && message && (
          <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {message}
          </pre>
        )}
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RotateCcw className="h-4 w-4" />
          Coba lagi
        </button>
      </div>
    </div>
  );
}
