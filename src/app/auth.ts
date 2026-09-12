import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import client from "@/lib/db";
import { ObjectId } from "mongodb";
import { compare } from "bcrypt-ts"
import { DBUser } from "@/types/user";

export const { auth, signIn, signOut, handlers } = NextAuth({
    adapter: MongoDBAdapter(client),
    // Off by default: Auth.js debug logging prints provider clientId/clientSecret
    // in full. Opt in with AUTH_DEBUG=true only when you need it locally.
    debug: process.env.AUTH_DEBUG === 'true',
    session: {
        strategy: "jwt"
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
            allowDangerousEmailAccountLinking:true
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: {
                    label: "Email",
                    type: "email"
                },
                password: {
                    label: "Password",
                    type: "password"
                }
            },
            authorize: async (credentials, req: Request) => {

                const email = credentials?.email as string | undefined;
                const password = credentials?.password as string | undefined;
                // console.log(email, password)

                if (!email || !password) {
                    throw new Error("Please Enter Valid Credentials!")
                }

                const dbClient = client;
                const db = dbClient.db()

                const user = await db.collection("users").findOne({ email: email });
                if (!user) {
                    throw new Error("Invalid Email or Password")
                }
                if (!user.password) {
                    throw new Error("Please sign in with Google or reset your password")
                }

                const isMatch = await compare(password, user?.password)

                if (!isMatch) {
                    throw new Error("Invalid Email or Password")
                }
                console.log({
                    name: user.name,
                    email: user.email,
                    id: user._id.toString(),
                })
                return {
                    name: user.name,
                    email: user.email,
                    id: user._id.toString(),
                    credits: user.credits
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                if("credits" in user){
                    token.credits = user.credits
                }

            } else if (trigger === 'update' && token.id) {
                // Credits were only ever written at sign-in, so the balance in
                // the session (and the navbar pill) stayed frozen at whatever it
                // was when the user logged in. Re-read it when the client calls
                // update(), which the navbar does on every route change.
                const db = client.db();
                const fresh = await db
                    .collection("users")
                    .findOne({ _id: new ObjectId(token.id as string) }, { projection: { credits: 1 } });
                if (fresh) {
                    token.credits = fresh.credits;
                }
            } else if (!token.id && token.email) {

                const db = client.db();
                const existingUser = await db
                    .collection("users")
                    .findOne({ email: token.email });
                if (existingUser) {
                    token.id = existingUser._id.toString();
                    token.credits = existingUser.credits;

                }
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.id as string;
            session.user.email = token.email!;
            session.user.name = token.name;
            session.user.credits = token.credits as number;
            return session;
        },
        signIn: async ({ user, account }) => {
            const dbClient = client;
            const db = dbClient.db()


            if (account?.provider === 'google') {
                try {
                    const { email, id, name, } = user


                    const alreadyUser = await db.collection("users").findOne({ email: email?.toLowerCase() })

                    if(alreadyUser){
                        if(!alreadyUser.googleId){
                            await db.collection('users').updateOne(
                                {email:email?.toLocaleLowerCase()},
                                {
                                    $set:{
                                        googleId:id,
                                        updatedAt:new Date()
                                    }
                                }
                            )
                        }
                    }else{
                         await db.collection("users").insertOne({
                            email: email?.toLowerCase(),
                            name: name,
                            googleId: id,
                            credits: 3,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }

                    return true
                } catch (error) {
                    console.error("Error in Google signIn callback:", error);
                    throw new Error("Error while Creating User")
                }
            }
            return true
        }
    },
    pages: {
        signIn: '/login',
        newUser: '/signup',
    }
})

