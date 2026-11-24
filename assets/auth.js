// تسجيل الدخول والمفضلة عبر Supabase Auth + جدول favorites المحمي بـ RLS.
// Email/password auth and per-user favorites via Supabase. The publishable
// key below is public by design; row access is enforced by RLS, not secrecy.
// No service-role key or database password ever belongs in this file.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://fbcwfizcmdulrkahypwi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_IhWwCJ24iCzbk6Gczyl98A_DP9aeuJs";

export const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const T = {
  ar: {
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة السر (٨ أحرف على الأقل)",
    needAccount: "ليس عندك حساب؟ أنشئ واحدًا",
    haveAccount: "عندك حساب؟ سجّل الدخول",
    signOut: "تسجيل الخروج",
    favorites: "المفضلة",
    signInToFav: "سجّل الدخول لحفظ المباراة في مفضلتك",
    badLogin: "بيانات الدخول غير صحيحة",
    shortPass: "كلمة السر قصيرة",
    genericErr: "حدث خطأ، حاول مرة أخرى",
    welcome: (e) => `مسجّل باسم ${e}`,
    reset: "نسيت كلمة السر؟",
    resetSent: "إن كان البريد مسجلًا لدينا، أرسلنا رابط إعادة التعيين. ملاحظة: لأن التسجيل لا يتحقق من البريد، تأكد أنك تملك هذا البريد فعلًا.",
    newPassTitle: "تعيين كلمة سر جديدة",
    newPass: "كلمة السر الجديدة (٨ أحرف على الأقل)",
    newPassSave: "حفظ كلمة السر الجديدة",
    newPassDone: "تم تغيير كلمة السر وتم تسجيل دخولك.",
    close: "إغلاق",
  },
  en: {
    signIn: "Sign in",
    signUp: "Create account",
    email: "Email",
    password: "Password (at least 8 characters)",
    needAccount: "No account? Create one",
    haveAccount: "Have an account? Sign in",
    signOut: "Sign out",
    favorites: "Favorites",
    signInToFav: "Sign in to save this match to your favorites",
    badLogin: "Incorrect sign-in details",
    shortPass: "Password too short",
    genericErr: "Something went wrong, try again",
    welcome: (e) => `Signed in as ${e}`,
    reset: "Forgot password?",
    resetSent: "If that email is registered, a reset link is on its way. Note: signup does not verify email ownership, so make sure you actually own this address.",
    newPassTitle: "Set a new password",
    newPass: "New password (at least 8 characters)",
    newPassSave: "Save new password",
    newPassDone: "Password changed and you are signed in.",
    close: "Close",
  },
};

let lang = "ar";
let user = null;
let favKeys = new Set();
const favListeners = new Set();

export function onFavChange(fn) { favListeners.add(fn); }
function emitFav() { favListeners.forEach((fn) => fn(favKeys, user)); }
export function getUser() { return user; }
export function isFav(key) { return favKeys.has(key); }

async function loadFavorites() {
  if (!user) { favKeys = new Set(); emitFav(); return; }
  const { data, error } = await sb.from("favorites").select("fixture_key");
  favKeys = error ? favKeys : new Set((data || []).map((r) => r.fixture_key));
  emitFav();
}

export async function toggleFavorite(key) {
  if (!user) { openAuthModal("signInToFav"); return false; }
  if (favKeys.has(key)) {
    favKeys.delete(key); emitFav();
    const { error } = await sb.from("favorites").delete()
      .eq("user_id", user.id).eq("fixture_key", key);
    if (error) { favKeys.add(key); emitFav(); return false; }
  } else {
    favKeys.add(key); emitFav();
    // Plain insert: upsert (ON CONFLICT DO UPDATE) would require an UPDATE
    // table grant we deliberately do not give. A duplicate (23505) already
    // means the favorite exists, so it counts as success.
    const { error } = await sb.from("favorites")
      .insert({ user_id: user.id, fixture_key: key });
    if (error && error.code !== "23505") { favKeys.delete(key); emitFav(); return false; }
  }
  return true;
}

// --- UI ---
function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else el.setAttribute(k, v);
  }
  children.forEach((c) => el.appendChild(c));
  return el;
}

export function openAuthModal(errKey) {
  document.getElementById("auth-modal")?.remove();
  const t = T[lang];
  let mode = "signIn";
  const err = h("p", { class: "auth-err", text: errKey ? t[errKey] || "" : "" });
  const email = h("input", { type: "email", class: "auth-input", placeholder: t.email, dir: "ltr" });
  const pass = h("input", { type: "password", class: "auth-input", placeholder: t.password, dir: "ltr" });
  const submit = h("button", { class: "auth-submit", type: "button", text: t.signIn });
  const switcher = h("button", { class: "auth-switch", type: "button", text: t.needAccount });
  const reset = h("button", { class: "auth-switch", type: "button", text: t.reset });

  async function submitForm() {
    err.textContent = "";
    submit.disabled = true;
    try {
      const e = email.value.trim(), p = pass.value;
      if (mode === "signUp" && p.length < 8) { err.textContent = t.shortPass; return; }
      const res = mode === "signUp"
        ? await sb.auth.signUp({ email: e, password: p })
        : await sb.auth.signInWithPassword({ email: e, password: p });
      if (res.error) err.textContent = /invalid/i.test(res.error.message) ? t.badLogin : t.genericErr;
      else document.getElementById("auth-modal")?.remove();
    } catch { err.textContent = t.genericErr; }
    finally { submit.disabled = false; }
  }
  submit.onclick = submitForm;
  pass.onkeydown = (ev) => { if (ev.key === "Enter") submitForm(); };
  switcher.onclick = () => {
    mode = mode === "signIn" ? "signUp" : "signIn";
    submit.textContent = t[mode];
    switcher.textContent = mode === "signIn" ? t.needAccount : t.haveAccount;
    err.textContent = "";
  };
  reset.onclick = async () => {
    err.textContent = "";
    const e = email.value.trim();
    if (e) await sb.auth.resetPasswordForEmail(e, { redirectTo: "https://kora-events-research.github.io/kora-events/" });
    err.textContent = t.resetSent;
  };

  const box = h("div", { class: "auth-box" }, [
    h("h3", { text: t[mode], id: "auth-title" }),
    email, pass, submit, switcher, reset, err,
    h("button", { class: "auth-close", type: "button", text: t.close,
      onclick: "" }),
  ]);
  box.querySelector(".auth-close").onclick = () => modal.remove();
  const modal = h("div", { class: "auth-modal", id: "auth-modal" }, [box]);
  modal.onclick = (ev) => { if (ev.target === modal) modal.remove(); };
  document.body.appendChild(modal);
  email.focus();
}

export function renderAuthButton() {
  const t = T[lang];
  const btn = document.getElementById("auth-btn");
  if (!btn) return;
  if (user) {
    btn.textContent = t.signOut;
    btn.onclick = async () => { await sb.auth.signOut(); };
  } else {
    btn.textContent = t.signIn;
    btn.onclick = () => openAuthModal();
  }
  const who = document.getElementById("auth-who");
  if (who) who.textContent = user ? t.welcome(user.email) : "";
}

export function setAuthLang(l) { lang = l; renderAuthButton(); emitFav(); }

function isRecoveryLanding() {
  return /[&#]type=recovery/.test(window.location.hash || "");
}

function openRecoveryModal() {
  document.getElementById("auth-modal")?.remove();
  const t = T[lang];
  const err = h("p", { class: "auth-err" });
  const pass = h("input", { type: "password", class: "auth-input", placeholder: t.newPass, dir: "ltr" });
  const submit = h("button", { class: "auth-submit", type: "button", text: t.newPassSave });
  async function save() {
    err.textContent = "";
    if (pass.value.length < 8) { err.textContent = t.shortPass; return; }
    submit.disabled = true;
    const { error } = await sb.auth.updateUser({ password: pass.value });
    submit.disabled = false;
    if (error) { err.textContent = t.genericErr; return; }
    err.textContent = t.newPassDone;
    err.style.color = "#1b5e20";
    history.replaceState(null, "", location.pathname + location.search);
    setTimeout(() => document.getElementById("auth-modal")?.remove(), 1800);
  }
  submit.onclick = save;
  pass.onkeydown = (ev) => { if (ev.key === "Enter") save(); };
  const box = h("div", { class: "auth-box" }, [
    h("h3", { text: t.newPassTitle }), pass, submit, err,
  ]);
  const modal = h("div", { class: "auth-modal", id: "auth-modal" }, [box]);
  document.body.appendChild(modal);
  pass.focus();
}

export async function initAuth(l) {
  lang = l;
  const recovery = isRecoveryLanding();
  const { data } = await sb.auth.getSession();
  if (recovery) openRecoveryModal();
  user = data.session?.user || null;
  renderAuthButton();
  await loadFavorites();
  sb.auth.onAuthStateChange((_ev, session) => {
    user = session?.user || null;
    renderAuthButton();
    loadFavorites();
    if (_ev === "PASSWORD_RECOVERY") openRecoveryModal();
  });
}
