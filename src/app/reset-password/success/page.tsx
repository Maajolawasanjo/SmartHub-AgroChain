import Link from "next/link";
export const metadata={robots:{index:false,follow:false}};
export default function Page(){return <main className="container min-h-screen py-20"><section className="surface max-w-xl p-8"><h1 className="text-3xl font-bold">Continue to sign in</h1><p className="mt-4 leading-7 text-[#526858]">If your password update completed, sign in with the new password. If it did not, request another secure recovery link.</p><div className="mt-6 flex gap-4"><Link href="/login">Sign in</Link><Link href="/forgot-password">Request another link</Link></div></section></main>}
