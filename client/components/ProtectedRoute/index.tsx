import { Navigate, Outlet } from 'react-router-dom';
import { useSnapshot } from 'valtio';
import state from '../../state';

export const ProtectedRoute = () => {
  const { isLoggedIn } = useSnapshot(state.auth);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ef05f324-2bd2-4798-b012-3d6b048b54c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute/index.tsx:6',message:'ProtectedRoute check',data:{isLoggedIn,url:window.location.href},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (!isLoggedIn) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ef05f324-2bd2-4798-b012-3d6b048b54c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute/index.tsx:9',message:'Redirecting to / - not logged in',data:{url:window.location.href},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
