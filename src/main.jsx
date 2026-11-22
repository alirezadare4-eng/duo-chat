import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('App Crash caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 24,
          color: '#fff',
          backgroundColor: '#0d0915',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          direction: 'rtl',
          fontFamily: 'system-ui'
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>❤️</div>
          <h2 style={{ color: '#f43f5e', fontSize: 18, fontWeight: 'bold' }}>برنامه در حال به‌روزرسانی است</h2>
          <p style={{ color: '#aaa', fontSize: 12, marginTop: 8, maxWidth: 300 }}>
            {this.state.error?.message || 'برای ورود مجدد دکمه زیر را لمس کنید'}
          </p>
          <button 
            onClick={() => {
              try { localStorage.clear(); } catch(e) {}
              window.location.reload();
            }} 
            style={{
              marginTop: 20,
              padding: '12px 28px',
              borderRadius: 16,
              background: 'linear-gradient(to right, #ec4899, #9333ea)',
              color: '#fff',
              border: 'none',
              fontWeight: 'bold',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            ورود به چت ✨
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
