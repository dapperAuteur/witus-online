import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account — WitUS",
  description: "Your WitUS account works across CentenarianOS and Work.WitUS.",
};

const faqs = [
  {
    q: "Do I need two accounts?",
    a: "No. One WitUS account gives you access to both CentenarianOS and Work.WitUS. Sign up on either app and your credentials work on both.",
  },
  {
    q: "Is my data shared between the apps?",
    a: "Your account credentials are shared. Your data (health records, job logs, invoices) lives in each app separately and is never mixed or exposed between platforms without your explicit action.",
  },
  {
    q: "What email address should I use?",
    a: "Use any email you like. The same email and password will authenticate you on both platforms.",
  },
  {
    q: "What if I forget my password?",
    a: "Use the password reset flow on whichever app you're trying to access. The reset applies to your shared WitUS account and will work on both.",
  },
  {
    q: "Is my account free?",
    a: "Creating a WitUS account is free. Each app has its own subscription tier — see the pricing pages on CentenarianOS and Work.WitUS for details.",
  },
];

export default function AccountPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase mb-4">
        Your Account
      </p>
      <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">
        One account, two platforms
      </h1>
      <p className="text-slate-400 leading-relaxed mb-12 max-w-xl">
        Your WitUS account is the key to the entire ecosystem. Sign up or log in once and
        access both CentenarianOS and Work.WitUS without managing separate credentials.
      </p>

      {/* App Links */}
      <div className="grid sm:grid-cols-2 gap-4 mb-16">
        <a
          href="https://centenarianos.com/login"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col p-6 rounded-xl border border-fuchsia-500/30 hover:border-fuchsia-500/60 bg-slate-900/50 transition-colors group"
        >
          <span className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
            <span className="text-sm font-semibold text-white">CentenarianOS</span>
          </span>
          <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
            Sign in at centenarianos.com &rarr;
          </span>
        </a>
        <a
          href="https://work.witus.online/login"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col p-6 rounded-xl border border-amber-500/30 hover:border-amber-500/60 bg-slate-900/50 transition-colors group"
        >
          <span className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-sm font-semibold text-white">Work.WitUS</span>
          </span>
          <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
            Sign in at work.witus.online &rarr;
          </span>
        </a>
      </div>

      {/* FAQ */}
      <h2 className="text-xl font-bold text-white mb-6">Frequently asked questions</h2>
      <div className="space-y-6">
        {faqs.map((faq) => (
          <div key={faq.q} className="border-b border-slate-800 pb-6 last:border-0">
            <p className="text-sm font-semibold text-white mb-2">{faq.q}</p>
            <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
