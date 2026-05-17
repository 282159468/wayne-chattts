import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) {
    return { error: e };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh items-center justify-center p-8 text-center">
          <div>
            <h2 className="text-lg font-bold text-red-600">应用崩溃</h2>
            <pre className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
              {this.state.error.message}
            </pre>
            <button
              className="mt-6 rounded-lg bg-neutral-900 px-6 py-2 text-sm text-white"
              onClick={() => window.location.reload()}
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
