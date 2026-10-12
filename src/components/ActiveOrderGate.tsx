import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildTrackingState, useActiveOrder } from '../hooks/useActiveOrder';

export function ActiveOrderGate() {
  const { order, orderId, stage, isLoading } = useActiveOrder();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading || !order || !orderId || !stage) return;
    const publicRoutes = ['/login', '/signup', '/register', '/forgot-password', '/reset-password'];
    const allowed = location.pathname === stage || location.pathname === '/what-went-wrong' || publicRoutes.includes(location.pathname) || (location.pathname === '/your-route' && location.state?.editMode === true && location.state?.orderId === orderId);
    if (!allowed) navigate(stage, { replace: true, state: buildTrackingState(order, orderId) });
  }, [isLoading, order, orderId, stage, location.pathname, location.state, navigate]);
  return null;
}
