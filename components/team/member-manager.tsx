"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMemberAction, removeMemberAction, updateMemberRoleAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { bnRelative, initials } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Member, Page } from "@/lib/types";

const ROLE_LABEL: Record<Member["role"], string> = {
  owner: "মালিক",
  admin: "অ্যাডমিন",
  moderator: "মডারেটর",
};

export function MemberManager({
  members,
  pages,
  canManage,
}: {
  members: Member[];
  pages: Page[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (_previous: { ok: boolean; message?: string } | null, formData: FormData) => addMemberAction(formData),
    null,
  );
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeRole(memberId: string, role: string) {
    startTransition(async () => {
      const result = await updateMemberRoleAction(memberId, role);
      if (!result.ok) setError("রোল বদলানো যায়নি");
      router.refresh();
    });
  }

  function remove(memberId: string) {
    startTransition(async () => {
      const result = await removeMemberAction(memberId);
      if (!result.ok) setError(result.message ?? "সরানো যায়নি");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[13.5px] font-[640]">টিম মেম্বার</h2>
        {canManage ? (
          <Button size="sm" variant="quiet" icon={<IconPlus size={15} />} onClick={() => setOpen((value) => !value)}>
            নতুন মেম্বার
          </Button>
        ) : null}
      </div>

      {open && canManage ? (
        <form action={formAction} className="card-surface grid gap-3 p-4 sm:grid-cols-2">
          <Field label="নাম">
            <Input name="name" placeholder="যেমন: নুসরাত জাহান" required />
          </Field>
          <Field label="ইমেইল">
            <Input name="email" type="email" placeholder="name@example.com" required />
          </Field>
          <Field label="রোল">
            <Select name="role" defaultValue="moderator">
              <option value="moderator">মডারেটর — শুধু ক্যাপশন ব্যবহার</option>
              <option value="admin">অ্যাডমিন — পেজ সেটিংস সহ</option>
            </Select>
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-[600] text-ink-soft">কোন পেজগুলোতে অ্যাক্সেস</span>
            <div className="flex flex-wrap gap-3 pt-1">
              {pages.map((page) => (
                <label key={page.id} className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                  <input type="checkbox" name="pageIds" value={page.id} defaultChecked />
                  {page.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "যোগ হচ্ছে…" : "মেম্বার যোগ করুন"}
            </Button>
            {state?.ok ? <span className="text-[12px] text-moss">যোগ হয়েছে</span> : null}
            {state && !state.ok ? <span className="text-[12px] text-berry">{state.message}</span> : null}
            <p className="ml-auto text-[11px] text-ink-faint">
              ইনভাইট ইমেইল যায় না — Cloudflare Access-এ যোগ করলেই লগইন পারবে।
            </p>
          </div>
        </form>
      ) : null}

      {error ? <p className="text-[12px] text-berry">{error}</p> : null}

      <ul className="overflow-hidden rounded-[18px] border border-line bg-card">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex flex-wrap items-center gap-3 border-b border-line/60 px-4 py-3 last:border-b-0"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-deep text-[11.5px] font-[650]">
              {initials(member.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-[580]">{member.name}</p>
              <p className="truncate text-[11.5px] text-ink-faint">{member.email}</p>
            </div>
            <div className="hidden flex-wrap gap-1 sm:flex">
              {member.pageIds.map((pageId) => {
                const page = pages.find((item) => item.id === pageId);
                return page ? (
                  <span key={pageId} className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-ink-soft">
                    {page.name}
                  </span>
                ) : null;
              })}
            </div>
            <span className="text-[10.5px] text-ink-faint">{bnRelative(member.lastActiveAt)}</span>

            {member.role === "owner" ? (
              <Badge tone="ink">মালিক</Badge>
            ) : canManage ? (
              <div className="flex items-center gap-1.5">
                <select
                  value={member.role}
                  onChange={(event) => changeRole(member.id, event.target.value)}
                  disabled={busy}
                  aria-label="রোল বদলান"
                  className={cn(
                    "h-8 rounded-[9px] border border-line bg-card px-2 text-[11.5px] text-ink-soft",
                    "outline-none focus:border-accent",
                  )}
                >
                  <option value="moderator">মডারেটর</option>
                  <option value="admin">অ্যাডমিন</option>
                </select>
                <button
                  type="button"
                  onClick={() => remove(member.id)}
                  disabled={busy}
                  aria-label={`${member.name} কে সরান`}
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line text-ink-faint transition-colors hover:border-berry/40 hover:text-berry"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            ) : (
              <Badge tone="neutral">{ROLE_LABEL[member.role]}</Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
