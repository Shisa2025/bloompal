export type AdminOption = {
  userid: string;
  displayName: string;
  organization: string | null;
};

export const missingOrganization = "Organization not provided";

export function filterAdminOptions(
  admins: AdminOption[],
  searchValue: string,
) {
  const search = searchValue.trim().toLocaleLowerCase();
  if (!search) return admins;

  return admins.filter((admin) =>
    [
      admin.userid,
      admin.displayName,
      admin.organization ?? missingOrganization,
    ].some((value) => value.toLocaleLowerCase().includes(search)),
  );
}
