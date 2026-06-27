import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Send,
  CheckCircle,
  AlertTriangle,
  Upload,
  Star,
  Globe,
  CornerDownRight,
  Hash,
  Mail,
  Phone,
  Link as LinkIcon,
  Calendar,
  Clock,
  ExternalLink,
  Lock
} from "lucide-react";
import { motion } from "motion/react";
import { getTranslation } from "../utils/translate";
import { Form, Question, QuestionType, QuestionOption } from "../types";
import SignaturePad from "./SignaturePad";

interface FormFillerProps {
  formId: string;
  lang: string;
  setLang: (lang: string) => void;
}

export default function FormFiller({ formId, lang, setLang }: FormFillerProps) {
  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [deviceRestrictionError, setDeviceRestrictionError] = useState("");

  useEffect(() => {
    if (form && form.settings?.ipRestriction) {
      const alreadySubmitted = localStorage.getItem(`form_submitted_${formId}`);
      if (alreadySubmitted) {
        setDeviceRestrictionError(
          lang === "BN" 
            ? "আপনি ইতিমধ্যে এই ফর্মটি পূরণ করেছেন। একই ডিভাইস থেকে একাধিক উত্তর জমা দেওয়ার অনুমতি নেই।" 
            : "You have already submitted a response. Multiple submissions are restricted for this form."
        );
      } else {
        setDeviceRestrictionError("");
      }
    } else {
      setDeviceRestrictionError("");
    }
  }, [form, lang, formId]);

  useEffect(() => {
    fetchPublicForm();
  }, [formId]);

  const fetchPublicForm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forms/${formId}/public`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(data);
    } catch (err: any) {
      setError(err.message || "Failed to load form.");
    } finally {
      setLoading(false);
    }
  };

  // Evaluate if a question should be shown based on conditional display logic rules
  const shouldShowQuestion = (q: Question): boolean => {
    if (!q.conditionalLogic || !q.conditionalLogic.enabled) return true;
    
    const triggerId = q.conditionalLogic.questionId;
    if (!triggerId) return true;

    const triggerAnswer = answers[triggerId];
    const op = q.conditionalLogic.operator;
    const targetValue = q.conditionalLogic.value?.toLowerCase().trim();

    if (triggerAnswer === undefined || triggerAnswer === null) {
      return false; // No answer provided yet
    }

    const currentStr = String(triggerAnswer).toLowerCase().trim();

    if (op === "has_value") {
      return currentStr !== "";
    }
    if (op === "equals") {
      return currentStr === targetValue;
    }
    if (op === "not_equals") {
      return currentStr !== targetValue;
    }
    if (op === "contains") {
      return currentStr.includes(targetValue);
    }

    return true;
  };

  const handleUpdateAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleFileUpload = (questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      
      // Upload Base64 to server uploads folder
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, fileData: base64 })
        });
        const data = await res.json();
        if (res.ok) {
          handleUpdateAnswer(questionId, data.url);
        } else {
          console.error(data.error);
        }
      } catch (err) {
        console.error("Error uploading file", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form) return;

    // Validate required fields (Only for currently shown questions!)
    for (const q of form.questions) {
      if (q.type === QuestionType.SECTION) continue;
      if (shouldShowQuestion(q) && q.required) {
        const ans = answers[q.id];
        if (ans === undefined || ans === null || ans === "" || (Array.isArray(ans) && ans.length === 0)) {
          setError(lang === "BN" ? `"${q.title}" পূরণ করা বাধ্যতামূলক।` : `"${q.title}" is a required field.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, language: lang })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (form.settings?.ipRestriction) {
        localStorage.setItem(`form_submitted_${formId}`, "true");
      }

      if (form.settings?.redirectUrl && form.settings.redirectUrl.trim() !== "") {
        let targetUrl = form.settings.redirectUrl.trim();
        if (!/^https?:\/\//i.test(targetUrl)) {
          targetUrl = `https://${targetUrl}`;
        }
        window.location.href = targetUrl;
        return;
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit responses.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060814] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen bg-[#060814] flex flex-col items-center justify-center p-4">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-2xl max-w-md text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
          <h3 className="font-sans font-bold text-lg text-white">Error Loading Form</h3>
          <p className="text-sm text-slate-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!form) return null;

  // Render Styling mapping based on active Theme selection
  const { preset, glowColor } = form.theme;
  
  // Calculate completion percentage for progress bar
  const totalQuestions = form.questions.filter((q) => q.type !== QuestionType.SECTION).length;
  const answeredQuestions = form.questions.filter((q) => {
    if (q.type === QuestionType.SECTION) return false;
    const ans = answers[q.id];
    return ans !== undefined && ans !== null && ans !== "" && (!Array.isArray(ans) || ans.length > 0);
  }).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  const isDark = preset.startsWith("dark") || preset === "retro-terminal";
  const isRetro = preset === "retro-terminal";

  // Accent shadow colors
  const glowShadowMap: Record<string, string> = {
    indigo: "rgba(99,102,241,0.25)",
    rose: "rgba(244,63,94,0.25)",
    emerald: "rgba(16,185,129,0.25)",
    cyan: "rgba(6,182,212,0.25)",
    violet: "rgba(139,92,246,0.25)",
    amber: "rgba(245,158,11,0.25)"
  };
  const activeGlowColor = glowColor || "indigo";
  const glowShadowHex = glowShadowMap[activeGlowColor];

  // Theme container classes
  let containerBg = "bg-[#060814]";
  let cardClass = "bg-slate-900/60 border-slate-800/80 text-white backdrop-blur-xl";
  let textTitleClass = "text-white";
  let textDescClass = "text-slate-400";
  let inputClass = "bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500/60";

  if (preset.startsWith("light")) {
    containerBg = "bg-[#f8fafc]";
    cardClass = "bg-white border-slate-200 text-slate-800 shadow-xl";
    textTitleClass = "text-slate-900";
    textDescClass = "text-slate-500";
    inputClass = "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500/40";
  } else if (isRetro) {
    containerBg = "bg-black";
    cardClass = "bg-black border-emerald-500/60 text-emerald-400 font-mono";
    textTitleClass = "text-emerald-300";
    textDescClass = "text-emerald-500";
    inputClass = "bg-black border-emerald-500/40 text-emerald-300 focus:border-emerald-500 font-mono";
  }

  // Branding classes based on theme
  let brandingTitleClass = "text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 mt-1 drop-shadow-[0_2px_10px_rgba(99,102,241,0.2)]";
  let brandingTextClass = "text-slate-600";
  let brandingSubClass = "text-slate-500";
  let brandingBorderClass = "border-slate-800/40";

  if (preset.startsWith("light")) {
    brandingTitleClass = "text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 mt-1";
    brandingTextClass = "text-slate-400";
    brandingSubClass = "text-slate-400";
    brandingBorderClass = "border-slate-200";
  } else if (isRetro) {
    brandingTitleClass = "text-emerald-400 font-mono mt-1 text-center font-bold tracking-widest";
    brandingTextClass = "text-emerald-600";
    brandingSubClass = "text-emerald-600";
    brandingBorderClass = "border-emerald-500/20";
  }

  return (
    <div className={`min-h-screen ${containerBg} py-12 px-4 relative overflow-hidden transition-colors duration-500`}>
      {/* Background radial ambient light for dark presets */}
      {isDark && !isRetro && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[35rem] h-[35rem] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      )}

      {/* Language Toggle */}
      <div className="absolute top-6 right-6">
        <button
          onClick={() => setLang(lang === "EN" ? "BN" : "EN")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg hover:opacity-90 transition-all ${
            isDark ? "bg-slate-900/80 border border-slate-800 text-slate-300" : "bg-white border border-slate-200 text-slate-700"
          }`}
        >
          {lang === "EN" ? "বাংলা" : "English"}
        </button>
      </div>

      <div className="max-w-2xl mx-auto z-10 relative">
        
        {deviceRestrictionError ? (
          /* Device restriction locked banner */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`border rounded-2xl p-8 text-center shadow-2xl relative ${cardClass}`}
            style={isDark && !isRetro ? { boxShadow: `0 0 50px -15px ${glowShadowHex}` } : {}}
          >
            <Lock className={`w-12 h-12 mx-auto mb-4 ${isRetro ? "text-emerald-400" : "text-indigo-400"}`} />
            <h2 className={`text-xl font-bold font-sans ${textTitleClass}`}>{lang === "BN" ? "উত্তর জমা দেওয়া সীমাবদ্ধ" : "Submission Blocked"}</h2>
            <p className={`text-sm mt-3 ${textDescClass}`}>{deviceRestrictionError}</p>
          </motion.div>
        ) : submitted ? (
          /* Submission success banner */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`border rounded-2xl p-8 text-center shadow-2xl relative ${cardClass}`}
            style={isDark && !isRetro ? { boxShadow: `0 0 50px -15px ${glowShadowHex}` } : {}}
          >
            <CheckCircle className={`w-16 h-16 mx-auto mb-4 ${isRetro ? "text-emerald-400" : "text-emerald-500"}`} />
            <h2 className={`text-2xl font-bold font-sans ${textTitleClass}`}>{getTranslation(lang, "submittedSuccess")}</h2>
            <button
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
              className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all"
            >
              {getTranslation(lang, "submitAnother")}
            </button>
          </motion.div>
        ) : (
          /* Core Form Viewer */
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Form Progress Bar */}
            {form.settings?.progressBar && (
              <div className={`sticky top-4 z-30 p-3.5 border rounded-xl flex items-center justify-between gap-4 shadow-lg backdrop-blur-md ${
                isDark ? "bg-slate-950/90 border-slate-850" : "bg-white/95 border-slate-200"
              }`}>
                <span className={`text-[10px] font-bold font-mono uppercase tracking-wider ${textDescClass}`}>
                  {lang === "BN" ? `ফর্মের অগ্রগতি: ${progressPercent}%` : `Form Progress: ${progressPercent}%`}
                </span>
                <div className="flex-1 h-2 bg-slate-800/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {/* Form Title & Description Hero Card */}
            <div
              className={`border rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-xl ${cardClass}`}
              style={isDark && !isRetro ? { boxShadow: `0 0 40px -15px ${glowShadowHex}` } : {}}
            >
              {/* Glowing bar accent on top of form */}
              {!isRetro && (
                <div
                  className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${activeGlowColor === "indigo" ? "#6366f1" : activeGlowColor === "rose" ? "#f43f5e" : "#10b981"}, transparent)`
                  }}
                ></div>
              )}

              <h1 className={`text-3xl font-extrabold tracking-tight font-sans ${textTitleClass}`}>{form.title}</h1>
              {form.description && <p className={`mt-3 text-sm leading-relaxed font-sans ${textDescClass}`}>{form.description}</p>}
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-xs font-sans">
                {error}
              </div>
            )}

            {/* Questions list */}
            {form.questions.map((q, idx) => {
              if (!shouldShowQuestion(q)) return null;

              // Render Section Divider specifically
              if (q.type === QuestionType.SECTION) {
                return (
                  <div key={q.id} className="py-4 border-b border-slate-800/60">
                    <h3 className={`text-lg font-bold font-sans ${isRetro ? "text-emerald-300" : "text-indigo-400"}`}>{q.title}</h3>
                    {q.description && <p className={`text-xs ${textDescClass} mt-1`}>{q.description}</p>}
                  </div>
                );
              }

              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-2xl p-6 relative shadow-md ${cardClass}`}
                >
                  <label className="block font-sans font-semibold text-sm mb-1">
                    <span className={textTitleClass}>
                      {q.title}
                    </span>
                    {q.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                  </label>
                  {q.description && <p className={`text-xs font-sans mb-3 ${textDescClass}`}>{q.description}</p>}

                  {/* Render Inputs specifically based on Question Types */}
                  <div className="mt-2.5">
                    
                    {/* Short Answer */}
                    {q.type === QuestionType.SHORT_ANSWER && (
                      <input
                        type="text"
                        placeholder={q.placeholder || "Enter answer..."}
                        value={answers[q.id] || ""}
                        onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-sans focus:outline-none transition-all ${inputClass}`}
                      />
                    )}

                    {/* Paragraph */}
                    {q.type === QuestionType.PARAGRAPH && (
                      <textarea
                        rows={3}
                        placeholder={q.placeholder || "Enter detailed response..."}
                        value={answers[q.id] || ""}
                        onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-sans focus:outline-none transition-all ${inputClass}`}
                      />
                    )}

                    {/* Numbers */}
                    {q.type === QuestionType.NUMBERS && (
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                          <Hash className="w-4 h-4" />
                        </span>
                        <input
                          type="number"
                          placeholder="e.g. 12"
                          value={answers[q.id] || ""}
                          onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-sans focus:outline-none transition-all ${inputClass}`}
                        />
                      </div>
                    )}

                    {/* Email */}
                    {q.type === QuestionType.EMAIL && (
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                          <Mail className="w-4 h-4" />
                        </span>
                        <input
                          type="email"
                          placeholder="user@example.com"
                          value={answers[q.id] || ""}
                          onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-sans focus:outline-none transition-all ${inputClass}`}
                        />
                      </div>
                    )}

                    {/* Phone */}
                    {q.type === QuestionType.PHONE && (
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                          <Phone className="w-4 h-4" />
                        </span>
                        <input
                          type="tel"
                          placeholder="+8801700000000"
                          value={answers[q.id] || ""}
                          onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-sans focus:outline-none transition-all ${inputClass}`}
                        />
                      </div>
                    )}

                    {/* Date Picker */}
                    {q.type === QuestionType.DATE && (
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 pointer-events-none">
                          <Calendar className="w-4 h-4" />
                        </span>
                        <input
                          type="date"
                          value={answers[q.id] || ""}
                          onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-sans focus:outline-none transition-all ${inputClass}`}
                        />
                      </div>
                    )}

                    {/* Time Picker */}
                    {q.type === QuestionType.TIME && (
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 pointer-events-none">
                          <Clock className="w-4 h-4" />
                        </span>
                        <input
                          type="time"
                          value={answers[q.id] || ""}
                          onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-sans focus:outline-none transition-all ${inputClass}`}
                        />
                      </div>
                    )}

                    {/* Website Link */}
                    {q.type === QuestionType.WEBSITE && (
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                          <LinkIcon className="w-4 h-4" />
                        </span>
                        <input
                          type="url"
                          placeholder="https://example.com"
                          value={answers[q.id] || ""}
                          onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-sans focus:outline-none transition-all ${inputClass}`}
                        />
                      </div>
                    )}

                    {/* Multiple Choice (MCQ Radio) */}
                    {q.type === QuestionType.MULTIPLE_CHOICE && (
                      <div className="space-y-2">
                        {q.options?.map((opt) => (
                          <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name={q.id}
                              checked={answers[q.id] === opt.label}
                              onChange={() => handleUpdateAnswer(q.id, opt.label)}
                              className="accent-indigo-500 w-4 h-4 shrink-0"
                            />
                            <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Checkboxes (Multi Check) */}
                    {q.type === QuestionType.CHECKBOXES && (
                      <div className="space-y-2">
                        {q.options?.map((opt) => {
                          const currentVal = answers[q.id] || [];
                          const isChecked = currentVal.includes(opt.label);
                          return (
                            <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const newVal = e.target.checked
                                    ? [...currentVal, opt.label]
                                    : currentVal.filter((v: string) => v !== opt.label);
                                  handleUpdateAnswer(q.id, newVal);
                                }}
                                className="accent-indigo-500 w-4 h-4 shrink-0"
                              />
                              <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Dropdown Select */}
                    {q.type === QuestionType.DROPDOWN && (
                      <select
                        value={answers[q.id] || ""}
                        onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs font-sans focus:outline-none transition-all ${inputClass}`}
                      >
                        <option value="">-- Select Option --</option>
                        {q.options?.map((opt) => (
                          <option key={opt.id} value={opt.label}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Image Choice Grid */}
                    {q.type === QuestionType.IMAGE_CHOICE && (
                      <div className="grid grid-cols-2 gap-3">
                        {q.options?.map((opt) => {
                          const isSelected = answers[q.id] === opt.label;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleUpdateAnswer(q.id, opt.label)}
                              className={`p-3 rounded-xl border-2 text-left flex flex-col items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-indigo-500 bg-indigo-500/10 scale-[1.02]"
                                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                              }`}
                            >
                              {opt.image ? (
                                <img src={opt.image} alt={opt.label} className="w-full h-24 object-cover rounded-lg" />
                              ) : (
                                <div className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-slate-600">
                                  Image choice
                                </div>
                              )}
                              <span className="text-xs font-semibold text-slate-300">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Yes / No Toggle buttons */}
                    {q.type === QuestionType.YES_NO && (
                      <div className="flex gap-3 max-w-xs">
                        {[
                          { val: true, label: "Yes" },
                          { val: false, label: "No" }
                        ].map((btn) => {
                          const isSel = answers[q.id] === btn.val;
                          return (
                            <button
                              key={btn.label}
                              type="button"
                              onClick={() => handleUpdateAnswer(q.id, btn.val)}
                              className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                isSel
                                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                                  : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400"
                              }`}
                            >
                              {btn.label === "Yes" ? getTranslation(lang, "yes") : getTranslation(lang, "no")}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Star Rating */}
                    {q.type === QuestionType.RATING && (
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const rating = answers[q.id] || 0;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleUpdateAnswer(q.id, star)}
                              className="p-1 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-600"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Linear scale Rating (1 to 5) */}
                    {q.type === QuestionType.LINEAR_SCALE && (
                      <div className="flex items-center justify-between max-w-xs p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Worst</span>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => {
                            const isSel = answers[q.id] === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleUpdateAnswer(q.id, val)}
                                className={`w-8 h-8 rounded-full border text-xs font-mono font-bold transition-all cursor-pointer ${
                                  isSel ? "bg-indigo-600 text-white border-indigo-500" : "border-slate-800 text-slate-400 hover:border-slate-700"
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Best</span>
                      </div>
                    )}

                    {/* Interactive Drawing Signature Pad */}
                    {q.type === QuestionType.SIGNATURE && (
                      <SignaturePad
                        value={answers[q.id] || ""}
                        onChange={(value) => handleUpdateAnswer(q.id, value)}
                        lang={lang}
                      />
                    )}

                    {/* File Upload drag and select */}
                    {q.type === QuestionType.FILE_UPLOAD && (
                      <div className="w-full">
                        {answers[q.id] ? (
                          <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                            <span className="text-xs text-indigo-400 truncate max-w-xs">{answers[q.id]}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateAnswer(q.id, "")}
                              className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 p-6 rounded-xl cursor-pointer hover:bg-slate-950/60 transition-all">
                            <Upload className="w-6 h-6 text-slate-600 mb-2" />
                            <span className="text-xs text-slate-400 font-semibold">{getTranslation(lang, "fileUploadBtn")}</span>
                            <span className="text-[10px] text-slate-600 mt-1">Accepts PNG, JPG, PDF up to 5MB</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleFileUpload(q.id, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    )}

                  </div>
                </motion.div>
              );
            })}

            {/* Form submission button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.45)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{form.settings?.customSubmitText || getTranslation(lang, "submit")}</span>
                </>
              )}
            </button>

          </form>
        )}

        {/* Custom "BORHAN" premium branding footer */}
        <div className={`mt-16 mb-6 text-center border-t ${brandingBorderClass} pt-6`}>
          <p className={`text-[10px] tracking-widest ${brandingTextClass} font-mono uppercase`}>Crafted & Built By</p>
          <h2 className={`text-3xl font-black tracking-widest ${brandingTitleClass} font-sans`}>
            BORHAN
          </h2>
          <p className={`text-[9px] text-indigo-400 font-mono mt-0.5 tracking-wider`}>Collect | Organize | Analyze | Succeed</p>
        </div>
      </div>
    </div>
  );
}
