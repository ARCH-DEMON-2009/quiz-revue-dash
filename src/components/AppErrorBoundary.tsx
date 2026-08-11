import { Component, type ErrorInfo, type ReactNode } from "react";
import ErrorState from "@/components/ErrorState";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** App-wide boundary so render crashes show a friendly (and entertaining) error page. */
class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="w-full max-w-2xl">
          <ErrorState
            title="Something went wrong"
            message={this.state.error.message || "An unexpected error occurred."}
            code={500}
            onRetry={() => window.location.reload()}
            retryLabel="Reload page"
            onBack={() => window.history.back()}
          />
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
