import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — WitUS",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase mb-4">Legal</p>
      <h1 className="text-4xl font-extrabold text-white mb-2 leading-tight">Terms of Service</h1>
      <p className="text-slate-500 text-sm mb-12">Last updated: March 2026</p>

      <div className="space-y-10 text-slate-400 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-3">1. Overview</h2>
          <p>
            These Terms of Service govern your use of WitUS.online and all associated platforms
            operated by B4C LLC / AwesomeWebStore.com, including CentenarianOS (centenarianos.com)
            and Work.WitUS (work.witus.online). By using any WitUS platform you agree to these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">2. Accounts</h2>
          <p>
            Your WitUS account grants access to the WitUS platform ecosystem. You are responsible
            for keeping your credentials secure. You must be 18 years or older to create an account.
            B4C LLC reserves the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">3. Acceptable Use</h2>
          <p>
            You agree not to use WitUS platforms to violate any laws, infringe on intellectual
            property, transmit malicious code, or interfere with platform operations. B4C LLC
            reserves the right to remove content or accounts that violate this policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">4. Subscriptions and Payments</h2>
          <p>
            Paid features on CentenarianOS and Work.WitUS are governed by subscription agreements
            presented at the time of purchase. All payments are processed by Stripe. Refund policies
            are described in the terms of each individual application.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">5. Intellectual Property</h2>
          <p>
            All WitUS platform software, branding, and content are the property of B4C LLC /
            AwesomeWebStore.com unless otherwise noted. You retain ownership of all data you
            enter into WitUS platforms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">6. Limitation of Liability</h2>
          <p>
            WitUS platforms are provided &quot;as is.&quot; B4C LLC makes no warranties, express or
            implied. To the maximum extent permitted by law, B4C LLC is not liable for indirect,
            incidental, or consequential damages arising from your use of the platforms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">7. Contact</h2>
          <p>
            Questions about these terms can be directed to{" "}
            <a
              href="mailto:admin@centenarianos.com"
              className="text-slate-300 hover:text-white transition-colors"
            >
              admin@CentenarianOS.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
