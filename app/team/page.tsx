import { MemberManager } from "@/components/team/member-manager";
import { listMembers, listPages } from "@/lib/data";
import { getSession } from "@/lib/session";
import { bn } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [members, pages, session] = await Promise.all([listMembers(), listPages(), getSession()]);
  const moderators = members.filter((member) => member.role === "moderator").length;
  const admins = members.filter((member) => member.role === "admin").length;

  return (
    <div className="flex flex-col gap-5">
      <header className="animate-fade">
        <p className="text-[11px] font-[620] uppercase tracking-[0.16em] text-ink-faint">টিম ও অ্যাক্সেস</p>
        <h1 className="mt-2 text-[26px] leading-tight sm:text-[30px]">কে কী করতে পারবে</h1>
        <p className="mt-1 max-w-[60ch] text-[13px] leading-[1.8] text-ink-soft">
          মডারেটর ক্যাপশন কপি ও পোস্ট মার্ক করতে পারে; অ্যাডমিন ব্র্যান্ড ও টিম বদলাতে পারে।
        </p>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-line/70 py-2.5 text-[12px] text-ink-soft">
          <div className="flex items-baseline gap-1.5">
            <dt>মোট</dt>
            <dd className="num font-[640] text-ink">{bn(members.length)}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt>মডারেটর</dt>
            <dd className="num font-[640] text-ink">{bn(moderators)}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt>অ্যাডমিন</dt>
            <dd className="num font-[640] text-ink">{bn(admins)}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt>আপনি</dt>
            <dd className="text-ink">{session.name}</dd>
          </div>
        </dl>
      </header>

      <MemberManager members={members} pages={pages} canManage={session.role !== "moderator"} />

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { title: "মডারেটর", text: "আজকের ফিড, কপি, এডিট, রিজেনারেট ও পোস্ট মার্ক।" },
          { title: "অ্যাডমিন", text: "ব্র্যান্ড কিট, প্রোডাক্ট স্কিপ, টিম ম্যানেজমেন্ট।" },
          { title: "মালিক", text: "সব পেজ, টিম ও সেটিংস। মালিককে সরানো যায় না।" },
        ].map((item) => (
          <div key={item.title} className="rounded-[16px] border border-line/80 bg-card/50 p-4">
            <p className="text-[12.5px] font-[620]">{item.title}</p>
            <p className="mt-1 text-[11.5px] leading-[1.75] text-ink-soft">{item.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
