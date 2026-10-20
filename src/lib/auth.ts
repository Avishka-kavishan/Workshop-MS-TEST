import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import db, { getDb, updateDb } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const data = await getDb();
        const user = data.users.find(
          (u) => u.username === credentials.username && u.isActive
        );

        if (!user) return null;

        const isValid = bcrypt.compareSync(credentials.password, user.passwordHash);
        if (!isValid) return null;

        const role = data.userRoles.find((r) => r.id === user.roleId);
        const org = data.organizations.find((o) => o.id === user.organizationId);

        // Update last login
        await updateDb((d) => {
          const u = d.users.find((u) => u.id === user.id);
          if (u) u.lastLogin = new Date().toISOString();
        });

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          username: user.username,
          designation: user.designation,
          organizationId: user.organizationId,
          organizationName: org?.name || '',
          roleId: user.roleId,
          roleName: role?.name || '',
          canCreateWorkshop: role?.canCreateWorkshop || false,
          canApproveWorkshop: role?.canApproveWorkshop || false,
          canManageUsers: role?.canManageUsers || false,
          canViewReports: role?.canViewReports || false,
          canManageOrganizations: role?.canManageOrganizations || false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.designation = (user as any).designation;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
        token.roleId = (user as any).roleId;
        token.roleName = (user as any).roleName;
        token.canCreateWorkshop = (user as any).canCreateWorkshop;
        token.canApproveWorkshop = (user as any).canApproveWorkshop;
        token.canManageUsers = (user as any).canManageUsers;
        token.canViewReports = (user as any).canViewReports;
        token.canManageOrganizations = (user as any).canManageOrganizations;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const data = await getDb();
        const freshUser = data.users.find(
          (u) => u.id === token.id || u.username === token.username
        );
        const freshOrg = freshUser
          ? data.organizations.find((o) => o.id === freshUser.organizationId)
          : null;
        const freshRole = freshUser
          ? data.userRoles.find((r) => r.id === freshUser.roleId)
          : null;

        session.user.name = freshUser?.fullName || token.name || '';
        (session.user as any).id = token.id;
        (session.user as any).username = freshUser?.username || token.username;
        (session.user as any).designation = freshUser?.designation || token.designation;
        (session.user as any).organizationId = freshUser?.organizationId || token.organizationId;
        (session.user as any).organizationName = freshOrg?.name || (token as any).organizationName || '';
        (session.user as any).roleId = freshUser?.roleId || (token as any).roleId;
        (session.user as any).roleName = freshRole?.name || (token as any).roleName || '';
        (session.user as any).canCreateWorkshop = freshRole?.canCreateWorkshop ?? (token as any).canCreateWorkshop;
        (session.user as any).canApproveWorkshop = freshRole?.canApproveWorkshop ?? (token as any).canApproveWorkshop;
        (session.user as any).canManageUsers = freshRole?.canManageUsers ?? (token as any).canManageUsers;
        (session.user as any).canViewReports = freshRole?.canViewReports ?? (token as any).canViewReports;
        (session.user as any).canManageOrganizations = freshRole?.canManageOrganizations ?? (token as any).canManageOrganizations;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || 'workshop-management-system-secret-key-2026',
};
