import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { increment, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RatingModal } from './RatingModal';
import { markOrderRated, useActiveOrder } from '../hooks/useActiveOrder';

export function PendingRatingHost() {
  const { pendingRatingOrder } = useActiveOrder();
  const location = useLocation();
  const shown = useRef<string | null>(null);
  if (!pendingRatingOrder || shown.current === pendingRatingOrder.id || ['/driver-coming', '/live-tracking'].includes(location.pathname)) return null;
  shown.current = pendingRatingOrder.id;
  const order = pendingRatingOrder;
  const close = async () => {
    const count = Number(order.ratingPromptCount || 0) + 1;
    await updateDoc(doc(db, 'orders', order.id), count >= 3 ? { ratingStatus: 'skipped' } : { ratingPromptCount: increment(1) });
  };
  return <RatingModal isOpen path={order.storeId ? 'store_delivery' : 'direct_trip'} driverName={order.driver?.name || 'Driver'} driverPhoto={order.driver?.photo || ''} driverId={order.driver?.id || order.driverId || ''} orderId={order.id} storeName={order.storeName} storeImage={order.storeImage} storeId={order.storeId} onClose={() => { void close(); }} onSubmitted={() => { void markOrderRated(order.id); }} />;
}
