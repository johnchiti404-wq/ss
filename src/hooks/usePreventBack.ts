import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function usePreventBack(isActiveRide: boolean) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isActiveRide) return;
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isActiveRide, navigate]);
}
