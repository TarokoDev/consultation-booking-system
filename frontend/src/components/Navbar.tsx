import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { formatFullName, getInitials } from "../utils/formatName";

export function Navbar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="navbar bg-base-100 shadow-sm px-4">
      <div className="navbar-start">
        <span className="text-lg font-semibold">Consultation Booking</span>
      </div>
      <div className="navbar-end">
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
              {getInitials(user)}
            </span>
            <span className="text-left text-sm">
              <span className="block font-medium text-gray-900">{formatFullName(user)}</span>
              <span className="block text-xs capitalize text-gray-500">{user.role}</span>
            </span>
          </button>
          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
              <button
                type="button"
                onClick={() => logout()}
                className="w-full rounded-md px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}