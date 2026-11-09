"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, CircleCheck } from "lucide-react";
import AuthShell from "./AuthShell";
import { useDatabaseAuth, useSignupEnabled, useLocalStaffSignup, useOwnerSetup, useOwnerRequests } from "./AuthMode";
import { loginAction, signupAction } from "./actions";
import {
  roles,
  resolveRole,
  validDemoLogin,
  DEMO_ONLY_PASSWORD,
  emptyRegistration,
  validateRegistration,
  type RoleId,
  type Registration,
  type FieldErrors,
} from "./demo";
import "./auth.css";
function AuthFormBody({
  mode,
  initialRole,
}: {
  mode: "login" | "register";
  initialRole: RoleId;
}) {
  const register = mode === "register";
  const databaseAuth = useDatabaseAuth();
  const signup = useSignupEnabled();
  const localStaff = useLocalStaffSignup();
  const ownerSetup = useOwnerSetup(), ownerRequests = useOwnerRequests();
  const [ownerSetupCode, setOwnerSetupCode] = useState("");
  const [productionRole, setProductionRole] = useState("baker");
  const registeredPending = useSearchParams().get("registered") === "pending";
  const registeredActive = useSearchParams().get("registered") === "active";
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const [role, setRole] = useState<RoleId>(register && localStaff && !ownerSetup && !ownerRequests && initialRole === "owner" ? "daily-worker" : initialRole);
  const [form, setForm] = useState<Registration>(emptyRegistration);
  const [visible, setVisible] = useState(false),
    [confirmVisible, setConfirmVisible] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loginError, setLoginError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);
  const selected = roles.find((r) => r.id === role)!;
  function resetRegistration() {
    setForm(emptyRegistration);
    setErrors({});
    setSubmitted(false);
    setVisible(false);
    setConfirmVisible(false);
  }
  function change(key: keyof Registration, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (register)
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    else {
      setLoginError("");
      setErrors({});
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (databaseAuth) {
      if (register && !signup) { setLoginError("Pendaftaran belum dibuka. Silakan hubungi Owner."); return; }
      setPending(true);
      setErrors({});
      setLoginError("");
      const data = new FormData();
      for (const [key, value] of Object.entries(form)) data.set(key, value);
      data.set("role", register && localStaff && role === "baker" ? productionRole : role);
      data.set("ownerSetupCode", register && role === "owner" ? ownerSetupCode : "");
      try {
        const result = await (register ? signupAction(data) : loginAction(data));
        if (result.ok && result.href) {
          setForm(f => ({ ...f, password: "", confirmPassword: "" }));
          setOwnerSetupCode("");
          router.replace(result.href);
          router.refresh();
        } else {
          setErrors(result.errors ?? {});
          setLoginError(result.message);
        }
      } catch { setLoginError("Permintaan tidak dapat diproses. Silakan coba lagi."); }
      finally { setPending(false); }
      return;
    }
    if (register) {
      const next = validateRegistration(form, role);
      setErrors(next);
      if (Object.keys(next).length) {
        requestAnimationFrame(() =>
          document.getElementById(`auth-${Object.keys(next)[0]}`)?.focus(),
        );
        return;
      }
      setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
      setVisible(false);
      setConfirmVisible(false);
      setSubmitted(true);
      requestAnimationFrame(() => successRef.current?.focus());
      return;
    }
    if (!form.username.trim() || !form.password) {
      setErrors({
        ...(form.username.trim() ? {} : { username: "Username wajib diisi." }),
        ...(form.password ? {} : { password: "Password wajib diisi." }),
      });
      setLoginError("Lengkapi username dan password.");
      return;
    }
    if (!validDemoLogin(role, form.username, form.password)) {
      setErrors({
        username: "Username atau password salah.",
        password: "Username atau password salah.",
      });
      setLoginError("Username atau password salah. Silakan coba lagi.");
      return;
    }
    setForm((f) => ({ ...f, password: "" }));
    setVisible(false);
    router.push(selected.href);
  }
  function field(
    label: string,
    key: keyof Registration,
    placeholder: string,
    type = "text",
    autoComplete?: string,
  ) {
    const password = key === "password" || key === "confirmPassword";
    const shown = key === "confirmPassword" ? confirmVisible : visible;
    const toggle =
      key === "confirmPassword"
        ? () => setConfirmVisible((v) => !v)
        : () => setVisible((v) => !v);
    const target =
      key === "confirmPassword" ? "konfirmasi password" : "password";
    return (
      <div className="a-field">
        <label htmlFor={`auth-${key}`}>
          {label}
          {key === "email" && <span> (opsional)</span>}
        </label>
        <div className="a-input-wrap">
          <input
            id={`auth-${key}`}
            name={key}
            type={password ? (shown ? "text" : "password") : type}
            value={form[key]}
            onChange={(e) => change(key, e.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={
              key === "phone" ? "tel" : key === "email" ? "email" : undefined
            }
            maxLength={
              key === "fullName" ? 50 : key === "username" ? 20 : undefined
            }
            aria-required={key !== "email"}
            aria-invalid={!!errors[key]}
            aria-describedby={
              errors[key]
                ? register
                  ? `error-${key}`
                  : "auth-login-feedback"
                : undefined
            }
          />
          {password && (
            <button
              type="button"
              className="a-eye"
              aria-label={`${shown ? "Sembunyikan" : "Tampilkan"} ${target}`}
              aria-pressed={shown}
              onClick={toggle}
            >
              {shown ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          )}
        </div>
        {register && errors[key] && (
          <p className="a-field-error" id={`error-${key}`}>
            {errors[key]}
          </p>
        )}
      </div>
    );
  }
  return (
    <AuthShell register={register} error={!!loginError}>
      <div className="a-card">
        <h1>
          {register ? "Buat Akun" : loginError ? "Masuk" : "Selamat Datang"}
        </h1>
        <p className="a-card-subtitle">
          {register
            ? "Pilih peran, lalu lengkapi data diri Anda"
            : "Pilih peran, lalu masukkan akun Anda"}
        </p>
        {databaseAuth && !register && registeredPending && <p className="a-card-subtitle" role="status">Pendaftaran diterima. Tunggu persetujuan Owner sebelum masuk.</p>}
        {databaseAuth && !register && registeredActive && <p className="a-card-subtitle" role="status">Pendaftaran berhasil. Silakan masuk menggunakan akun baru Anda.</p>}
        {submitted ? (
          <div
            className="a-register-success"
            role="status"
            tabIndex={-1}
            ref={successRef}
          >
            <CircleCheck size={40} />
            <h2>Pendaftaran demo berhasil</h2>
            <p>
              Data {form.fullName.trim()} telah divalidasi untuk peran{" "}
              {selected.label}. Akun asli tidak dibuat dan password tidak
              disimpan.
            </p>
            <p>
              Gunakan akun demo <strong>{selected.username}</strong> untuk
              mencoba Sign in.
            </p>
            <Link
              className="a-primary"
              href={`/login?role=${role}`}
              onClick={resetRegistration}
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <fieldset className="a-role-fieldset">
              <legend>Masuk sebagai</legend>
              <div className="a-roles">
                {roles.map((r) => (
                  <label
                    key={r.id}
                    className={`a-role ${role === r.id ? "a-role-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.id}
                      checked={role === r.id}
                      disabled={register && localStaff && !ownerSetup && !ownerRequests && r.id === "owner"}
                      aria-label={r.label}
                      onChange={() => {
                        setRole(r.id);
                        setLoginError("");
                        if (!register) setErrors({});
                        else setErrors((e) => ({ ...e, role: undefined }));
                      }}
                    />
                    {register ? (
                      <span className="a-role-radio">
                        {role === r.id && <Check size={14} />}
                      </span>
                    ) : (
                      <r.Icon
                        className="a-role-icon"
                        size={21}
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      <strong>{r.label}</strong>
                      <small>{r.subtitle}</small>
                    </span>
                  </label>
                ))}
              </div>
              {errors.role && (
                <p className="a-field-error" id="error-role">
                  {errors.role}
                </p>
              )}
            </fieldset>
            {register && localStaff && role === "baker" && <div className="a-field"><label htmlFor="production-role">Peran produksi</label><select id="production-role" value={productionRole} onChange={e => setProductionRole(e.target.value)}><option value="baker">Baker</option><option value="barista">Barista</option></select></div>}
            <div className="a-fields">
              {register && role === "owner" && ownerSetup && <div className="a-field"><label htmlFor="owner-setup-code">Kode setup Owner{ownerRequests ? " (kosongkan untuk meminta persetujuan)" : ""}</label><div className="a-input-wrap"><input id="owner-setup-code" name="ownerSetupCode" type="password" value={ownerSetupCode} onChange={e => setOwnerSetupCode(e.target.value)} autoComplete="off" maxLength={4096}/></div><p>Kode sekali pakai dari administrator lokal. Password akun tetap dibuat di bawah.</p></div>}
              {register ? (
                <>
                  {field(
                    "Nama lengkap",
                    "fullName",
                    "Masukkan nama lengkap",
                    "text",
                    "name",
                  )}
                  <div className="a-double-field">
                    {field(
                      "Username",
                      "username",
                      "Masukkan username",
                      "text",
                      "username",
                    )}
                    {field("Nomor HP", "phone", "08xxxxxxxxxx", "tel", "tel")}
                  </div>
                  {field("Email", "email", "Masukkan email", "email", "email")}
                  {field(
                    "Password",
                    "password",
                    "Minimal 8 karakter",
                    "password",
                    "new-password",
                  )}
                  {field(
                    "Konfirmasi password",
                    "confirmPassword",
                    "Ulangi password",
                    "password",
                    "new-password",
                  )}
                </>
              ) : (
                <>
                  {field(
                    "Username",
                    "username",
                    "Masukkan username",
                    "text",
                    "username",
                  )}
                  {field(
                    "Password",
                    "password",
                    "••••",
                    "password",
                    "current-password",
                  )}
                </>
              )}
            </div>
            {register ? (
              <>
                {loginError && <p className="a-login-alert" role="alert">{loginError}</p>}
                <button type="submit" disabled={pending} className="a-primary a-register-submit">
                  {pending ? "Memproses…" : "Sign up"}
                </button>
                <p className="a-signin-text">
                  Sudah punya akun?{" "}
                  <Link
                    href={`/login?role=${role}`}
                    onClick={resetRegistration}
                  >
                    Sign in
                  </Link>
                </p>
              </>
            ) : (
              <>
                <div className="a-feedback">
                  {loginError && (
                    <p
                      className="a-login-alert"
                      id="auth-login-feedback"
                      role="alert"
                    >
                      {loginError}
                    </p>
                  )}
                </div>
                <button className="a-primary" type="submit" disabled={pending}>
                  {pending ? "Memproses…" : loginError ? "Masuk" : "Sign In"}
                </button>
                {!loginError && (!databaseAuth || signup) && (
                  <Link className="a-secondary" href={`/register?role=${role}`}>
                    Sign up
                  </Link>
                )}
              </>
            )}
          </form>
        )}
      </div>
      {!databaseAuth && <details className="a-demo-details">
        <summary>Simulasi frontend · Info akun demo</summary>
        <p>
          Peran {selected.label}: <strong>{selected.username}</strong>
          {role === "baker" ? " (atau usr03)" : ""}
          <br />
          Password demo: <strong>{DEMO_ONLY_PASSWORD}</strong>
        </p>
        <p>Akun contoh untuk demonstrasi, bukan autentikasi asli.</p>
      </details>}
    </AuthShell>
  );
}
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const params = useSearchParams();
  const initialRole = resolveRole(params.get("role"));
  return (
    <AuthFormBody
      key={mode + initialRole}
      mode={mode}
      initialRole={initialRole}
    />
  );
}
