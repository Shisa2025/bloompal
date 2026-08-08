"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  filterAdminOptions,
  missingOrganization,
  type AdminOption,
} from "./admin-options";

export default function AdminCombobox({ admins }: { admins: AdminOption[] }) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedUserid, setSelectedUserid] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedAdmin = admins.find(
    (admin) => admin.userid === selectedUserid,
  );
  const normalizedSearch = searchValue.trim().toLocaleLowerCase();
  const filterText =
    selectedAdmin && searchValue === selectedAdmin.userid
      ? ""
      : normalizedSearch;
  const filteredAdmins = useMemo(
    () => filterAdminOptions(admins, filterText),
    [admins, filterText],
  );
  const validActiveIndex =
    activeIndex >= 0 && activeIndex < filteredAdmins.length ? activeIndex : -1;

  useEffect(() => {
    if (!isOpen || validActiveIndex < 0) return;
    document
      .getElementById(`${listboxId}-option-${validActiveIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [isOpen, listboxId, validActiveIndex]);

  function openList() {
    setIsOpen(true);
    const selectedIndex = filteredAdmins.findIndex(
      (admin) => admin.userid === selectedUserid,
    );
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : filteredAdmins.length ? 0 : -1);
  }

  function closeList() {
    setIsOpen(false);
    setSearchValue(selectedUserid);
    setActiveIndex(-1);
  }

  function chooseAdmin(admin: AdminOption) {
    setSelectedUserid(admin.userid);
    setSearchValue(admin.userid);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function clearAdmin() {
    setSelectedUserid("");
    setSearchValue("");
    setIsOpen(true);
    setActiveIndex(admins.length ? 0 : -1);
    inputRef.current?.focus();
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setSearchValue(nextValue);
    setSelectedUserid("");
    setIsOpen(true);
    setActiveIndex(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openList();
        return;
      }
      setActiveIndex((current) =>
        filteredAdmins.length ? (current + 1) % filteredAdmins.length : -1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openList();
        return;
      }
      setActiveIndex((current) =>
        filteredAdmins.length
          ? (current <= 0 ? filteredAdmins.length : current) - 1
          : -1,
      );
      return;
    }

    if (event.key === "Enter" && isOpen && validActiveIndex >= 0) {
      event.preventDefault();
      const admin = filteredAdmins[validActiveIndex];
      if (admin) chooseAdmin(admin);
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      closeList();
    }
  }

  return (
    <div
      className="signup-admin-combobox signup-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closeList();
      }}
    >
      <label htmlFor={inputId}>
        Admin <span>(optional)</span>
      </label>
      <div className="signup-admin-picker">
        <div className="signup-admin-input-row">
          <input
            ref={inputRef}
            id={inputId}
            className="login-input"
            type="text"
            value={searchValue}
          placeholder="Search Admin ID, name, or organization"
          autoComplete="off"
          role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-describedby={`${inputId}-selection`}
            aria-activedescendant={
              isOpen && validActiveIndex >= 0
                ? `${listboxId}-option-${validActiveIndex}`
                : undefined
            }
            onChange={handleChange}
            onClick={openList}
            onFocus={openList}
            onKeyDown={handleKeyDown}
          />
          {selectedAdmin ? (
            <button
              className="signup-admin-clear"
              type="button"
              aria-label={`Clear selected Admin ${selectedAdmin.displayName}`}
              onClick={clearAdmin}
            >
              Clear
            </button>
          ) : null}
        </div>
        <input name="adminUserid" type="hidden" value={selectedUserid} />

        {isOpen ? (
          <div
            className="signup-admin-results"
            id={listboxId}
            role="listbox"
            aria-label="Active Admins"
          >
            {filteredAdmins.length ? (
              filteredAdmins.map((admin, index) => (
                <button
                  id={`${listboxId}-option-${index}`}
                  className={`signup-admin-option${index === validActiveIndex ? " is-active" : ""}`}
                  key={admin.userid}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={admin.userid === selectedUserid}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => chooseAdmin(admin)}
                >
                  <span className="signup-admin-option-heading">
                    <strong>{admin.displayName}</strong>
                    <span>{admin.userid}</span>
                  </span>
                  <span className="signup-admin-organization">
                    {admin.organization ?? missingOrganization}
                  </span>
                </button>
              ))
            ) : (
              <p className="signup-admin-empty" role="status">
                {admins.length
                  ? "No Admins match your search."
                  : "No active Admins are available. You can continue without one."}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <p
        className="signup-admin-selection"
        id={`${inputId}-selection`}
        aria-live="polite"
      >
        {selectedAdmin
          ? `Selected: ${selectedAdmin.displayName} · ${selectedAdmin.organization ?? missingOrganization}`
          : "No Admin selected. You can continue with an unassigned account."}
      </p>
    </div>
  );
}
