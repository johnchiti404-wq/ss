import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { increment, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RatingModal } from './RatingModal';
import { markOrderRated, useActiveOrder } from '../hooks/useActiveOrder';

export function PendingRatingHost() {
  const { pendingRatingOrder } = useActiveOrder();
  const location = useLocation();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const ratedIds = useRef(new Set<string>());
  if (!pendingRatingOrder || dismissedIds.includes(pendingRatingOrder.id) || ['/driver-coming', '/live-tracking'].includes(location.pathname)) return null;
  const order = pendingRatingOrder;
  const close = async () => {
    if (ratedIds.current.has(order.id)) return;
    const count = Number(order.ratingPromptCount || 0) + 1;
    setDismissedIds(ids => ids.includes(order.id) ? ids : [...ids, order.id]);
    await updateDoc(doc(db, 'orders', order.id), count >= 3 ? { ratingStatus: 'skipped' } : { ratingPromptCount: increment(1) });
  };
  const submit = () => {
    ratedIds.current.add(order.id);
    setDismissedIds(ids => ids.includes(order.id) ? ids : [...ids, order.id]);
    void markOrderRated(order.id);
  };
  return <RatingModal isOpen path={order.storeId ? 'store_delivery' : 'direct_trip'} driverName={order.driver?.name || 'Driver'} driverPhoto={order.driver?.photo || ''} driverId={order.driver?.id || order.driverId || ''} orderId={order.id} storeName={order.storeName} storeImage={order.storeImage} storeId={order.storeId} onClose={() => { void close(); }} onSubmitted={submit} />;
}
