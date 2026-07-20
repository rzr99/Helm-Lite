import { Shell } from "@/components/shell";
import { Card, Avatar, btnPrimary, inputClass, labelClass } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { AvatarUploader } from "@/components/avatar-upload";
import { updateMyName } from "@/app/profile/actions";

export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = {
  owner: "Owner",
  team_lead: "Team Lead",
  agent: "Agent",
};

export default async function ProfilePage() {
  const { profile } = await requireProfile();

  return (
    <Shell
      profile={profile}
      active="profile"
      title="Your profile"
      subtitle="Your name and picture, as the rest of the team sees them."
    >
      <div className="max-w-xl">
        <Card title="Profile picture" padded>
          <div className="flex items-center gap-5">
            <Avatar
              name={profile.full_name}
              src={profile.avatar_url}
              size={16}
            />
            <div className="flex-1">
              <AvatarUploader
                userId={profile.id}
                hasAvatar={Boolean(profile.avatar_url)}
              />
            </div>
          </div>
        </Card>

        <div className="mt-6">
          <Card title="Your name" padded>
            <form action={updateMyName} className="flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1">
                <label className={labelClass}>Full name</label>
                <input
                  name="full_name"
                  required
                  defaultValue={profile.full_name}
                  className={inputClass}
                />
              </div>
              <button type="submit" className={btnPrimary}>
                Save
              </button>
            </form>
            <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
              Signed in as {roleLabel[profile.role]}. Roles are managed by the
              owner{profile.role === "owner" ? " (that's you) on the Team page" : ""}.
            </p>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
