/**
 * Auto-computes workshop lifecycle status based on dates relative to today.
 * 
 * - If today < startDate: 'Scheduled' (Pending)
 * - If startDate <= today <= endDate: 'In Progress'
 * - If today > endDate: 'Completed'
 * - If status is explicitly 'Cancelled': remains 'Cancelled'
 */
export function computeWorkshopStatus(w: {
  startDate?: string;
  endDate?: string;
  status?: string;
  statusName?: string;
  statusId?: string;
}): {
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  statusName: string;
  statusId: string;
} {
  const current = (w.status || w.statusName || '').toLowerCase();
  if (current === 'cancelled') {
    return { status: 'Cancelled', statusName: 'Cancelled', statusId: 'status-cancelled' };
  }

  const startStr = (w.startDate || '').slice(0, 10);
  const endStr = (w.endDate || w.startDate || '').slice(0, 10);

  if (!startStr) {
    return { status: 'Scheduled', statusName: 'Scheduled', statusId: 'status-scheduled' };
  }

  // Get current date string in local YYYY-MM-DD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (todayStr > endStr) {
    return { status: 'Completed', statusName: 'Completed', statusId: 'status-completed' };
  } else if (todayStr >= startStr && todayStr <= endStr) {
    return { status: 'In Progress', statusName: 'In Progress', statusId: 'status-ongoing' };
  } else {
    return { status: 'Scheduled', statusName: 'Scheduled', statusId: 'status-scheduled' };
  }
}
