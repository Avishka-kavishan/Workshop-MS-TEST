import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const data = await getDb();
  const allNotifications = data.notifications || [];

  // Notifications relevant to user: either targeted to their organizationId, userId, or if admin
  const userNotifications = allNotifications.filter((n) => {
    if (user.roleName === 'System Administrator' || user.username === 'admin') return true;
    return n.recipientOrgId === user.organizationId || n.recipientUserId === user.id;
  });

  userNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  return NextResponse.json({ notifications: userNotifications, unreadCount });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const body = await req.json().catch(() => ({}));
  const { notificationId, markAllRead } = body;

  await updateDb((data) => {
    if (!data.notifications) data.notifications = [];
    if (markAllRead) {
      data.notifications.forEach((n) => {
        if (n.recipientOrgId === user.organizationId || n.recipientUserId === user.id || user.username === 'admin') {
          n.isRead = true;
        }
      });
    } else if (notificationId) {
      const notif = data.notifications.find((n) => n.id === notificationId);
      if (notif) notif.isRead = true;
    }
  });

  return NextResponse.json({ success: true });
}
