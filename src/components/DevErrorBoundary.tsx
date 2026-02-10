import React from 'react';
import { send } from '../utils/ipc';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export default class DevErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  componentDidCatch(error: any, info: any) {
    this.setState({ hasError: true, message: String(error && error.message || error) });
    try {
      send('renderer-error', {
        boundary: true,
        message: error && error.message,
        stack: error && error.stack,
        info,
      });
    } catch {}
    // Also surface in console for visibility
    // eslint-disable-next-line no-console
    console.error('[renderer] ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
          <h3>Something went wrong</h3>
          <pre>{this.state.message}</pre>
        </div>
      );
    }
    return this.props.children as any;
  }
}
