import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const passwordOk = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!passwordOk) return null;

        // Fetch owned areas for area owners
        let ownedAreaIds: string[] = [];
        if (user.role === "AREA_OWNER") {
          const owned = await prisma.areaOwner.findMany({
            where: { userId: user.id },
            select: { areaId: true },
          });
          ownedAreaIds = owned.map((o) => o.areaId);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          ownedAreaIds,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.ownedAreaIds = (user as any).ownedAreaIds ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as Role;
        (session.user as any).ownedAreaIds = token.ownedAreaIds as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
