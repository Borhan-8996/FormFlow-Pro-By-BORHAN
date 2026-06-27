import React, { useState } from "react";
import { Mail, Lock, User, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { getTranslation } from "../utils/translate";

interface AuthProps {
  onAuthSuccess: (token: string, user: { id: string; name: string; email: string }) => void;
  lang: string;
  setLang: (lang: string) => void;
}

export default function Auth({ onAuthSuccess, lang, setLang }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060814] flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient radial glow effects */}
      <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Language Toggle in Top Right */}
      <div className="absolute top-6 right-6">
        <button
          onClick={() => setLang(lang === "EN" ? "BN" : "EN")}
          className="bg-slate-900/80 border border-slate-800 text-slate-300 font-sans font-medium px-4 py-1.5 rounded-full text-xs shadow-lg hover:border-slate-700 hover:text-white transition-all duration-300"
        >
          {lang === "EN" ? "বাংলা" : "English"}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10"
      >
        {/* App Title & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-mono mb-4 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{getTranslation(lang, "tagline")}</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-sans font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
          >
            {getTranslation(lang, "appName")}
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-sans max-w-sm mx-auto">
            {lang === "EN"
              ? "Build full-featured interactive forms with live sync, responsive drawing canvases, custom rules, and glow effects."
              : "লাইভ সিঙ্ক, রেসপনসিভ ড্রয়িং ক্যানভাস, কাস্টম লজিক এবং আকর্ষণীয় গ্লো ইফেক্ট দিয়ে চমৎকার সব ফর্ম তৈরি করুন।"}
          </p>
        </div>

        {/* Authentication Card */}
        <div
          className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
          style={{
            boxShadow: "0 0 50px -15px rgba(99, 102, 241, 0.2)"
          }}
        >
          {/* Top subtle glow line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-cyan-500 opacity-60"></div>

          {/* Login/Register Tabs */}
          <div className="flex border-b border-slate-800/80 mb-6">
            <button
              onClick={() => {
                setIsLogin(true);
                setError("");
              }}
              className={`flex-1 pb-3 text-sm font-sans font-semibold transition-all ${
                isLogin ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {getTranslation(lang, "login")}
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError("");
              }}
              className={`flex-1 pb-3 text-sm font-sans font-semibold transition-all ${
                !isLogin ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {getTranslation(lang, "register")}
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-xs font-sans">
                {error}
              </div>
            )}

            {/* Name Input (Register Only) */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold font-sans text-slate-400 mb-1.5 uppercase tracking-wider">
                  {getTranslation(lang, "name")}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm font-sans focus:outline-none focus:border-indigo-500/60 transition-all focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold font-sans text-slate-400 mb-1.5 uppercase tracking-wider">
                {getTranslation(lang, "email")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@formflow.pro"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm font-sans focus:outline-none focus:border-indigo-500/60 transition-all focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold font-sans text-slate-400 mb-1.5 uppercase tracking-wider">
                {getTranslation(lang, "password")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm font-sans focus:outline-none focus:border-indigo-500/60 transition-all focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold font-sans text-sm rounded-xl transition-all shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.45)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span>{isLogin ? getTranslation(lang, "login") : getTranslation(lang, "register")}</span>
              )}
            </button>
          </form>

          {/* Toggle Footnote */}
          <div className="text-center mt-6 text-xs text-slate-400 font-sans">
            {isLogin ? (
              <p>
                {getTranslation(lang, "noAccount")}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError("");
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  {getTranslation(lang, "register")}
                </button>
              </p>
            ) : (
              <p>
                {getTranslation(lang, "alreadyAccount")}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError("");
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  {getTranslation(lang, "login")}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Custom "BORHAN" premium branding footer */}
        <div className="mt-12 text-center">
          <p className="text-[10px] tracking-widest text-slate-600 font-mono uppercase">Crafted & Built By</p>
          <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 mt-1 drop-shadow-[0_2px_10px_rgba(99,102,241,0.2)] font-sans">
            BORHAN
          </h2>
          <p className="text-[9px] text-indigo-400 font-mono mt-0.5 tracking-wider">Collect | Organize | Analyze | Succeed</p>
        </div>
      </motion.div>
    </div>
  );
}
