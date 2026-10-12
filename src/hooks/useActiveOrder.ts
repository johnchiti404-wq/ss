import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { collection, onSnapshot, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';

export const ACTIVE_STATUSES = ['pending', 'accepted', 'arriving', 'arrived', 'started', 'in_progress', 'on_trip', 'ready_for_pickup', 'driver_assigned'] as const;
export const INACTIVE_STATUSES = ['completed', 'cancelled', 'cancelled_pending_refund', 'rejected', 'declined', 'missed', 'no_driver_found'] as const;

export type ActiveOrder = DocumentData & { id: string; status?: string; driverStatus?: string; storeId?: string; createdAt?: { toMillis?: () => number } };

export function routeForOrder(order: ActiveOrder): string {
  if (order.storeId) {
    if (order.status === 'driver_assigned' && ['assigned', 'at_store', 'picked_up', 'delivered'].includes(order.driverStatus || '')) return '/live-tracking';
    return '/order-tracking';
  }
  return order.status === 'pending' ? '/waiting-for-driver' : '/driver-coming';
}

export function buildTrackingState(order: ActiveOrder, orderId: string) {
  return { orderId, orderType: order.orderType || order.serviceType, orderData: { ...order, pickup: order.pickup?.address || order.pickup, destination: order.dropoff?.address || order.destination, driverId: order.driver?.id || order.driverId, driverInfo: order.driver, encodedPolyline: order.encodedPolyline } };
}

interface ActiveOrderContextValue { order: ActiveOrder | null; orderId: string | null; stage: string | null; isLoading: boolean; pendingRatingOrder: ActiveOrder | null; }
const ActiveOrderContext = createContext<ActiveOrderContextValue | null>(null);

function newest(items: ActiveOrder[]) { return items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0] || null; }

export function ActiveOrderProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [pendingRatingOrder, setPendingRatingOrder] = useState<ActiveOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const activeQuery = query(collection(db, 'orders'), where('userId', '==', uid), where('status', 'in', [...ACTIVE_STATUSES]));
    const ratingQuery = query(collection(db, 'orders'), where('userId', '==', uid), where('ratingStatus', '==', 'pending'), where('status', '==', 'completed'));
    const unsubActive = onSnapshot(activeQuery, snapshot => { setOrders(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))); setIsLoading(false); });
    const unsubRating = onSnapshot(ratingQuery, snapshot => setPendingRatingOrder(newest(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))));
    return () => { unsubActive(); unsubRating(); };
  }, [uid]);
  const order = useMemo(() => newest([...orders]), [orders]);
  return <ActiveOrderContext.Provider value={{ order, orderId: order?.id || null, stage: order ? routeForOrder(order) : null, isLoading, pendingRatingOrder: order ? null : pendingRatingOrder }}>{children}</ActiveOrderContext.Provider>;
}

export function useActiveOrder() { const value = useContext(ActiveOrderContext); if (!value) throw new Error('useActiveOrder must be used inside ActiveOrderProvider'); return value; }

export function markOrderRated(orderId: string) {
  return import('firebase/firestore').then(({ doc, updateDoc, serverTimestamp }) => updateDoc(doc(db, 'orders', orderId), { ratingStatus: 'rated', ratedAt: serverTimestamp() }));
}
