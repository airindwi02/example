"use client";
import { createContext, useContext } from "react";
const Context = createContext({ enabled: false, signup: false, approvals: false, localStaff: false, ownerSetup: false, ownerRequests: false });
export function AuthMode({ enabled, signup, approvals, localStaff, ownerSetup, ownerRequests, children }: { enabled: boolean; signup: boolean; approvals: boolean; localStaff: boolean; ownerSetup: boolean; ownerRequests: boolean; children: React.ReactNode }) { return <Context.Provider value={{ enabled, signup, approvals, localStaff, ownerSetup, ownerRequests }}>{children}</Context.Provider>; }
export function useDatabaseAuth() { return useContext(Context).enabled; }
export function useSignupEnabled() { return useContext(Context).signup; }
export function useApprovalsEnabled() { return useContext(Context).approvals; }
export function useLocalStaffSignup() { return useContext(Context).localStaff; }
export function useOwnerSetup() { return useContext(Context).ownerSetup; }
export function useOwnerRequests() { return useContext(Context).ownerRequests; }
