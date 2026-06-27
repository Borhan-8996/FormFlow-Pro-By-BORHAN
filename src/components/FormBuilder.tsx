import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Settings as SettingsIcon,
  Palette,
  Eye,
  FileText,
  MessageSquare,
  Sparkles,
  Settings2,
  CheckCircle,
  HelpCircle,
  PlusCircle,
  Download,
  Printer,
  X,
  FileSpreadsheet,
  Workflow
} from "lucide-react";
import { motion } from "motion/react";
import { getTranslation } from "../utils/translate";
import { Form, Question, QuestionType, FormSettings, FormTheme, QuestionOption } from "../types";

interface FormBuilderProps {
  formId: string;
  token: string;
  onBack: () => void;
  lang: string;
}

export default function FormBuilder({ formId, token, onBack, lang }: FormBuilderProps) {
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"questions" | "theme" | "settings" | "submissions">("questions");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchFormDetails();
  }, [formId]);

  const fetchFormDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(data);

      // Fetch responses
      const respRes = await fetch(`/api/forms/${formId}/responses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const respData = await respRes.json();
      if (respRes.ok) setResponses(respData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async (updatedForm: Form) => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(data);
      setMessage("Form saved successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(`Error saving form: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // --- QUESTIONS LOGIC ---
  const handleAddQuestion = (type: QuestionType) => {
    if (!form) return;
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type,
      title: type === QuestionType.SECTION ? "New Section Divider" : "New Question Title",
      required: false,
      placeholder: "",
      options: [QuestionType.MULTIPLE_CHOICE, QuestionType.CHECKBOXES, QuestionType.DROPDOWN, QuestionType.IMAGE_CHOICE].includes(type)
        ? [
            { id: `opt_1_${Date.now()}`, label: "Option 1" },
            { id: `opt_2_${Date.now()}`, label: "Option 2" }
          ]
        : [],
      conditionalLogic: {
        enabled: false,
        questionId: "",
        operator: "equals",
        value: ""
      }
    };

    const updated = {
      ...form,
      questions: [...form.questions, newQuestion]
    };
    setForm(updated);
    handleSaveForm(updated);
  };

  const handleUpdateQuestion = (questionId: string, fields: Partial<Question>) => {
    if (!form) return;
    const updatedQuestions = form.questions.map((q) => {
      if (q.id === questionId) {
        return { ...q, ...fields };
      }
      return q;
    });

    const updated = { ...form, questions: updatedQuestions };
    setForm(updated);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!form) return;
    const updated = {
      ...form,
      questions: form.questions.filter((q) => q.id !== questionId)
    };
    setForm(updated);
    handleSaveForm(updated);
  };

  const handleDuplicateQuestion = (q: Question) => {
    if (!form) return;
    const duplicated: Question = {
      ...q,
      id: `q_${Date.now()}`,
      title: `${q.title} (Copy)`
    };
    const index = form.questions.findIndex((item) => item.id === q.id);
    const updatedQuestions = [...form.questions];
    updatedQuestions.splice(index + 1, 0, duplicated);

    const updated = { ...form, questions: updatedQuestions };
    setForm(updated);
    handleSaveForm(updated);
  };

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    if (!form) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= form.questions.length) return;

    const updatedQuestions = [...form.questions];
    const temp = updatedQuestions[index];
    updatedQuestions[index] = updatedQuestions[newIndex];
    updatedQuestions[newIndex] = temp;

    const updated = { ...form, questions: updatedQuestions };
    setForm(updated);
    handleSaveForm(updated);
  };

  // --- OPTIONS LOGIC ---
  const handleAddOption = (questionId: string) => {
    if (!form) return;
    const updatedQuestions = form.questions.map((q) => {
      if (q.id === questionId) {
        const options = q.options || [];
        return {
          ...q,
          options: [...options, { id: `opt_${Date.now()}`, label: `Option ${options.length + 1}` }]
        };
      }
      return q;
    });
    setForm({ ...form, questions: updatedQuestions });
  };

  const handleUpdateOption = (questionId: string, optionId: string, label: string, image?: string) => {
    if (!form) return;
    const updatedQuestions = form.questions.map((q) => {
      if (q.id === questionId) {
        const options = q.options?.map((opt) => {
          if (opt.id === optionId) {
            return { ...opt, label, ...(image !== undefined ? { image } : {}) };
          }
          return opt;
        });
        return { ...q, options };
      }
      return q;
    });
    setForm({ ...form, questions: updatedQuestions });
  };

  const handleDeleteOption = (questionId: string, optionId: string) => {
    if (!form) return;
    const updatedQuestions = form.questions.map((q) => {
      if (q.id === questionId) {
        return { ...q, options: q.options?.filter((o) => o.id !== optionId) };
      }
      return q;
    });
    setForm({ ...form, questions: updatedQuestions });
  };

  // Handle Option Image upload (convert to Base64)
  const handleOptionImageUpload = (questionId: string, optionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      handleUpdateOption(questionId, optionId, "", base64);
    };
    reader.readAsDataURL(file);
  };

  // --- CSV / EXCEL EXPORT ---
  const handleExportCSV = () => {
    if (!form || responses.length === 0) return;

    const headers = ["Submission Date", ...form.questions.filter(q => q.type !== QuestionType.SECTION).map(q => q.title)];
    const rows = responses.map((r) => {
      const date = new Date(r.submittedAt).toLocaleString();
      const answers = form.questions
        .filter(q => q.type !== QuestionType.SECTION)
        .map((q) => {
          const ans = r.answers[q.id];
          if (ans === undefined || ans === null) return "";
          if (Array.isArray(ans)) return ans.join(" | ");
          if (typeof ans === "object") return "[Upload/Sign File]";
          return String(ans);
        });
      return [date, ...answers];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${form.title.replace(/\s+/g, "_")}_Submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- PRINT FORM LAYOUT ---
  const handlePrintLayout = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060814] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="min-h-screen bg-[#060814] text-slate-200 font-sans flex flex-col relative print:bg-white print:text-black">
      {/* Save indicator popup */}
      {message && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-950 border border-indigo-500/30 text-indigo-200 px-4 py-3 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 animate-scale-up">
          <CheckCircle className="w-4 h-4 text-indigo-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-[#080a1c] border-b border-slate-800/60 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-40 print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleUpdateQuestion("title", { title: e.target.value })}
              onBlur={() => handleSaveForm(form)}
              className="bg-transparent text-lg font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none px-1 py-0.5 w-full font-sans transition-all"
            />
            <span className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{getTranslation(lang, "tagline")}</span>
            </span>
          </div>
        </div>

        {/* Builder Tab Selection Controls */}
        <div className="flex bg-slate-950 p-1 border border-slate-800/80 rounded-xl max-w-sm md:max-w-md w-full">
          {(["questions", "theme", "settings", "submissions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Form Preview Option */}
          {(() => {
            const basePath = window.location.pathname.split('/form/')[0].replace(/\/$/, "");
            return (
              <a
                href={`${basePath}/form/${form.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === "EN" ? "Preview" : "প্রিভিউ"}</span>
              </a>
            );
          })()}

          {/* Save button explicitly */}
          <button
            onClick={() => handleSaveForm(form)}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saving ? getTranslation(lang, "saving") : getTranslation(lang, "save")}</span>
          </button>
        </div>
      </header>

      {/* Editor Main Canvas Row */}
      <div className="flex-1 flex flex-col md:flex-row relative print:bg-white print:text-black">
        
        {/* SIDEBAR: Question Type selector (Visible in 'questions' tab only) */}
        {activeTab === "questions" && (
          <aside className="w-full md:w-64 bg-[#080a1c] border-r border-slate-800/60 p-5 shrink-0 print:hidden h-[calc(100vh-77px)] overflow-y-auto">
            <h4 className="font-mono text-[10px] uppercase text-slate-500 tracking-widest font-bold mb-4">
              {lang === "EN" ? "Choose Question Type" : "প্রশ্নের ধরন নির্বাচন করুন"}
            </h4>

            {/* Standard inputs group */}
            <div className="space-y-4 mb-6">
              <div>
                <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider block mb-2">Standard Inputs</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { type: QuestionType.SHORT_ANSWER, label: "Short Answer", icon: "Aa" },
                    { type: QuestionType.PARAGRAPH, label: "Paragraph", icon: "¶" },
                    { type: QuestionType.NUMBERS, label: "Number Value", icon: "12" },
                    { type: QuestionType.YES_NO, label: "Yes / No Toggle", icon: "Y/N" },
                    { type: QuestionType.SECTION, label: "Section Header", icon: "Section" }
                  ].map((qType) => (
                    <button
                      key={qType.type}
                      onClick={() => handleAddQuestion(qType.type)}
                      className="w-full bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 text-left px-3 py-2 rounded-xl text-xs text-slate-300 font-semibold flex items-center justify-between group transition-all cursor-pointer"
                    >
                      <span>{qType.label}</span>
                      <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-indigo-400 font-mono group-hover:text-white transition-colors">{qType.icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced choice groups */}
              <div>
                <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-wider block mb-2">Choice Selections</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { type: QuestionType.MULTIPLE_CHOICE, label: "Multiple Choice", icon: "MCQ" },
                    { type: QuestionType.CHECKBOXES, label: "Checkboxes", icon: "[]" },
                    { type: QuestionType.DROPDOWN, label: "Dropdown Select", icon: "Dropdown" },
                    { type: QuestionType.IMAGE_CHOICE, label: "Image Choice Grid", icon: "Img" }
                  ].map((qType) => (
                    <button
                      key={qType.type}
                      onClick={() => handleAddQuestion(qType.type)}
                      className="w-full bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 text-left px-3 py-2 rounded-xl text-xs text-slate-300 font-semibold flex items-center justify-between group transition-all cursor-pointer"
                    >
                      <span>{qType.label}</span>
                      <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400 font-mono group-hover:text-white transition-colors">{qType.icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Highly interactive group */}
              <div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider block mb-2">Advanced Collectors</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { type: QuestionType.SIGNATURE, label: "Draw Signature", icon: "Sign" },
                    { type: QuestionType.FILE_UPLOAD, label: "File Upload", icon: "Upload" },
                    { type: QuestionType.RATING, label: "Star Rating", icon: "Rating" },
                    { type: QuestionType.LINEAR_SCALE, label: "Linear Rating Scale", icon: "Scale" },
                    { type: QuestionType.EMAIL, label: "Email Address", icon: "@" },
                    { type: QuestionType.PHONE, label: "Phone Number", icon: "Phone" },
                    { type: QuestionType.DATE, label: "Date Picker", icon: "Date" },
                    { type: QuestionType.TIME, label: "Time Picker", icon: "Time" },
                    { type: QuestionType.WEBSITE, label: "Website Link", icon: "Link" }
                  ].map((qType) => (
                    <button
                      key={qType.type}
                      onClick={() => handleAddQuestion(qType.type)}
                      className="w-full bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 text-left px-3 py-2 rounded-xl text-xs text-slate-300 font-semibold flex items-center justify-between group transition-all cursor-pointer"
                    >
                      <span>{qType.label}</span>
                      <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400 font-mono group-hover:text-white transition-colors">{qType.icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* WORKSPACE MIDDLE BODY: Renders active Tab contents */}
        <main className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full overflow-y-auto print:p-0">

          {/* TAB: Questions Editor Canvas */}
          {activeTab === "questions" && (
            <div className="space-y-6">
              {/* Form Info Box */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 rounded-l-2xl"></div>
                <input
                  type="text"
                  placeholder="Form Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  onBlur={() => handleSaveForm(form)}
                  className="w-full bg-transparent border-b border-transparent hover:border-slate-800 focus:border-indigo-500 text-slate-300 text-sm font-sans focus:outline-none pb-1 placeholder:text-slate-600"
                />
              </div>

              {form.questions.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-800/60 rounded-2xl bg-slate-950/20">
                  <PlusCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="font-sans font-semibold text-slate-400 text-sm">
                    {lang === "EN" ? "Your Form is Empty" : "আপনার ফর্মটি খালি"}
                  </h4>
                  <p className="text-xs text-slate-500 font-sans mt-1 max-w-xs mx-auto">
                    {lang === "EN"
                      ? "Select any question type from the sidebar on the left to start adding custom fields."
                      : "কাস্টম ফিল্ড যোগ করতে বাম পাশের সাইডবার থেকে যেকোনো প্রশ্নের ধরন নির্বাচন করুন।"}
                  </p>
                </div>
              ) : (
                form.questions.map((q, idx) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative hover:border-slate-700/50 transition-all"
                  >
                    {/* Header bar within question card */}
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider font-bold">
                          {idx + 1}. {q.type.replace("_", " ")}
                        </span>
                      </div>
                      
                      {/* Movement re-ordering buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveQuestion(idx, "up")}
                          className="p-1 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-md disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === form.questions.length - 1}
                          onClick={() => handleMoveQuestion(idx, "down")}
                          className="p-1 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-md disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question inputs */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Title input */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            {getTranslation(lang, "title")}
                          </label>
                          <input
                            type="text"
                            value={q.title}
                            onChange={(e) => handleUpdateQuestion(q.id, { title: e.target.value })}
                            onBlur={() => handleSaveForm(form)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500/60"
                          />
                        </div>

                        {/* Description input */}
                        {q.type !== QuestionType.SECTION && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Description / Hint
                            </label>
                            <input
                              type="text"
                              value={q.description || ""}
                              placeholder="Optional instructions..."
                              onChange={(e) => handleUpdateQuestion(q.id, { description: e.target.value })}
                              onBlur={() => handleSaveForm(form)}
                              className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500/60"
                            />
                          </div>
                        )}
                      </div>

                      {/* Options Configuration Section (Conditional for choices) */}
                      {[QuestionType.MULTIPLE_CHOICE, QuestionType.CHECKBOXES, QuestionType.DROPDOWN, QuestionType.IMAGE_CHOICE].includes(q.type) && (
                        <div className="bg-slate-950/60 border border-slate-800/40 p-4 rounded-xl">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
                              {getTranslation(lang, "options")}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddOption(q.id)}
                              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{getTranslation(lang, "addOption")}</span>
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {q.options?.map((opt, optIdx) => (
                              <div key={opt.id} className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 font-mono">{optIdx + 1}.</span>
                                
                                <input
                                  type="text"
                                  value={opt.label}
                                  onChange={(e) => handleUpdateOption(q.id, opt.id, e.target.value)}
                                  onBlur={() => handleSaveForm(form)}
                                  className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-indigo-500/40"
                                />

                                {/* Image choice file upload visualizer */}
                                {q.type === QuestionType.IMAGE_CHOICE && (
                                  <div className="flex items-center gap-2">
                                    {opt.image ? (
                                      <div className="relative w-8 h-8 rounded border border-slate-800 overflow-hidden">
                                        <img src={opt.image} alt="Choice" className="w-full h-full object-cover" />
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateOption(q.id, opt.id, opt.label, "")}
                                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-rose-400"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-sans font-semibold cursor-pointer">
                                        <span>Image</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => handleOptionImageUpload(q.id, opt.id, e)}
                                          className="hidden"
                                        />
                                      </label>
                                    )}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteOption(q.id, opt.id)}
                                  className="p-1.5 bg-slate-900 border border-slate-800/80 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Advanced Conditional Show/Hide logic rules */}
                      {q.type !== QuestionType.SECTION && (
                        <div className="bg-slate-950/40 border border-slate-800/40 p-4 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                              <Workflow className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{getTranslation(lang, "conditionalLogic")}</span>
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={q.conditionalLogic?.enabled || false}
                                onChange={(e) =>
                                  handleUpdateQuestion(q.id, {
                                    conditionalLogic: {
                                      ...(q.conditionalLogic || { enabled: false, questionId: "", operator: "equals", value: "" }),
                                      enabled: e.target.checked
                                    }
                                  })
                                }
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                            </label>
                          </div>

                          {q.conditionalLogic?.enabled && (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Pick Trigger question from predecessor questions */}
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Trigger Question</label>
                                <select
                                  value={q.conditionalLogic.questionId}
                                  onChange={(e) =>
                                    handleUpdateQuestion(q.id, {
                                      conditionalLogic: { ...q.conditionalLogic!, questionId: e.target.value }
                                    })
                                  }
                                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
                                >
                                  <option value="">-- Choose Question --</option>
                                  {form.questions
                                    .slice(0, idx)
                                    .filter((pred) => pred.type !== QuestionType.SECTION)
                                    .map((pred) => (
                                      <option key={pred.id} value={pred.id}>
                                        {pred.title}
                                      </option>
                                    ))}
                                </select>
                              </div>

                              {/* Pick Operator */}
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Operator</label>
                                <select
                                  value={q.conditionalLogic.operator}
                                  onChange={(e) =>
                                    handleUpdateQuestion(q.id, {
                                      conditionalLogic: { ...q.conditionalLogic!, operator: e.target.value as any }
                                    })
                                  }
                                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
                                >
                                  <option value="equals">Equals</option>
                                  <option value="not_equals">Does Not Equal</option>
                                  <option value="contains">Contains Word</option>
                                  <option value="has_value">Has Any Value</option>
                                </select>
                              </div>

                              {/* Value Input */}
                              {q.conditionalLogic.operator !== "has_value" && (
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Trigger Answer Value</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Yes"
                                    value={q.conditionalLogic.value}
                                    onChange={(e) =>
                                      handleUpdateQuestion(q.id, {
                                        conditionalLogic: { ...q.conditionalLogic!, value: e.target.value }
                                      })
                                    }
                                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Footer controls */}
                      <div className="flex justify-between items-center pt-4 border-t border-slate-800/60">
                        {/* Required toggle */}
                        {q.type !== QuestionType.SECTION ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-sans">{getTranslation(lang, "required")}</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={q.required}
                                onChange={(e) => handleUpdateQuestion(q.id, { required: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                            </label>
                          </div>
                        ) : (
                          <div></div>
                        )}

                        <div className="flex items-center gap-2">
                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(q)}
                            className="p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 bg-slate-950 border border-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Delete Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* TAB: Theme Style Editor */}
          {activeTab === "theme" && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="font-sans font-bold text-lg text-white mb-1">
                  {getTranslation(lang, "themePreset")}
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Select a styling theme for your public form preview. Gradients and glowing borders represent FormFlow Pro design values.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "dark-glow-indigo", label: "Dark Cosmic Indigo", style: "bg-[#060814] border-indigo-500/40 text-white" },
                    { id: "dark-glow-rose", label: "Dark Cosmic Rose", style: "bg-[#060814] border-rose-500/40 text-white" },
                    { id: "dark-glow-emerald", label: "Dark Cosmic Emerald", style: "bg-[#060814] border-emerald-500/40 text-white" },
                    { id: "dark-glow-cyan", label: "Dark Cosmic Cyan", style: "bg-[#060814] border-cyan-500/40 text-white" },
                    { id: "light-glow-indigo", label: "Light Velvet Indigo", style: "bg-slate-50 border-indigo-200 text-slate-800" },
                    { id: "light-glow-rose", label: "Light Velvet Rose", style: "bg-slate-50 border-rose-200 text-slate-800" },
                    { id: "light-glow-emerald", label: "Light Velvet Emerald", style: "bg-slate-50 border-emerald-200 text-slate-800" },
                    { id: "retro-terminal", label: "Retro Geek Terminal", style: "bg-black border-green-500 text-green-400 font-mono" }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        const updated = {
                          ...form,
                          theme: { ...form.theme, preset: preset.id as any }
                        };
                        setForm(updated);
                        handleSaveForm(updated);
                      }}
                      className={`p-4 rounded-xl text-left border-2 flex flex-col justify-between h-24 transition-all cursor-pointer ${preset.style} ${
                        form.theme.preset === preset.id ? "ring-2 ring-indigo-500 scale-[1.02]" : "opacity-80"
                      }`}
                    >
                      <span className="text-xs font-bold">{preset.label}</span>
                      <span className="text-[10px] opacity-60">Preset Sample</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color picker */}
              <div className="pt-4 border-t border-slate-800/60">
                <h3 className="font-sans font-bold text-sm text-slate-300 uppercase tracking-wider mb-3">
                  {getTranslation(lang, "glowColor")}
                </h3>
                <div className="flex items-center gap-3">
                  {(["indigo", "rose", "emerald", "cyan", "violet", "amber"] as const).map((color) => {
                    const bgGlowMap: Record<string, string> = {
                      indigo: "bg-indigo-500 shadow-[0_0_12px_#6366f1]",
                      rose: "bg-rose-500 shadow-[0_0_12px_#f43f5e]",
                      emerald: "bg-emerald-500 shadow-[0_0_12px_#10b981]",
                      cyan: "bg-cyan-500 shadow-[0_0_12px_#06b6d4]",
                      violet: "bg-violet-500 shadow-[0_0_12px_#8b5cf6]",
                      amber: "bg-amber-500 shadow-[0_0_12px_#f59e0b]"
                    };
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...form,
                            theme: { ...form.theme, glowColor: color }
                          };
                          setForm(updated);
                          handleSaveForm(updated);
                        }}
                        className={`w-8 h-8 rounded-full ${bgGlowMap[color]} transition-all cursor-pointer ${
                          form.theme.glowColor === color ? "ring-2 ring-white scale-110" : ""
                        }`}
                        title={color}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Form Configuration Settings */}
          {activeTab === "settings" && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
              <h3 className="font-sans font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-400" />
                <span>Form Configurations</span>
              </h3>

              <div className="space-y-4">
                {/* Active Status Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800/40 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{getTranslation(lang, "isActive")}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Toggle whether the form accepts new submissions.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.settings.isActive}
                      onChange={(e) => {
                        const updated = {
                          ...form,
                          settings: { ...form.settings, isActive: e.target.checked }
                        };
                        setForm(updated);
                        handleSaveForm(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {/* Submissions limit */}
                <div className="p-4 bg-slate-950/60 border border-slate-800/40 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-slate-200">{getTranslation(lang, "limitResponses")}</label>
                  <input
                    type="number"
                    value={form.settings.limitResponses}
                    onChange={(e) => {
                      const updated = {
                        ...form,
                        settings: { ...form.settings, limitResponses: parseInt(e.target.value) || 0 }
                      };
                      setForm(updated);
                    }}
                    onBlur={() => handleSaveForm(form)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-lg w-full max-w-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Closed Form Message */}
                <div className="p-4 bg-slate-950/60 border border-slate-800/40 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-slate-200">{getTranslation(lang, "closeMessage")}</label>
                  <input
                    type="text"
                    value={form.settings.closeMessage}
                    onChange={(e) => {
                      const updated = {
                        ...form,
                        settings: { ...form.settings, closeMessage: e.target.value }
                      };
                      setForm(updated);
                    }}
                    onBlur={() => handleSaveForm(form)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-lg w-full focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Live Excel Sync Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800/40 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{getTranslation(lang, "autoExcelSync")}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Auto compiles and formats submissions for direct integration.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.settings.autoExcelSync}
                      onChange={(e) => {
                        const updated = {
                          ...form,
                          settings: { ...form.settings, autoExcelSync: e.target.checked }
                        };
                        setForm(updated);
                        handleSaveForm(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {/* Custom Submit Button Text */}
                <div className="p-4 bg-slate-950/60 border border-slate-800/40 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-slate-200">Custom Submit Button Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Submit, Register, Apply Now"
                    value={form.settings.customSubmitText || ""}
                    onChange={(e) => {
                      const updated = {
                        ...form,
                        settings: { ...form.settings, customSubmitText: e.target.value }
                      };
                      setForm(updated);
                    }}
                    onBlur={() => handleSaveForm(form)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-lg w-full max-w-xs focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[9px] text-slate-500">Change the label of the primary submit button on your public form.</p>
                </div>

                {/* Redirect URL after submission */}
                <div className="p-4 bg-slate-950/60 border border-slate-800/40 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-slate-200">Redirect on Submission URL</label>
                  <input
                    type="url"
                    placeholder="e.g. https://yourwebsite.com/thank-you"
                    value={form.settings.redirectUrl || ""}
                    onChange={(e) => {
                      const updated = {
                        ...form,
                        settings: { ...form.settings, redirectUrl: e.target.value }
                      };
                      setForm(updated);
                    }}
                    onBlur={() => handleSaveForm(form)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-lg w-full focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[9px] text-slate-500">Redirect users to an external web page immediately upon submission.</p>
                </div>

                {/* Email Notification Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800/40 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Instant Email Notifications</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Receive developer notifications when a user submits a new response.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.settings.emailNotification || false}
                      onChange={(e) => {
                        const updated = {
                          ...form,
                          settings: { ...form.settings, emailNotification: e.target.checked }
                        };
                        setForm(updated);
                        handleSaveForm(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {/* Show Progress Bar Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#080a1c]/60 border border-slate-800/40 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Show Progress Bar</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Displays an elegant progress bar at the top as users fill out the form.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.settings.progressBar || false}
                      onChange={(e) => {
                        const updated = {
                          ...form,
                          settings: { ...form.settings, progressBar: e.target.checked }
                        };
                        setForm(updated);
                        handleSaveForm(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {/* Limit One Response Per Device */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800/40 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Limit to 1 Response Per Device</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Prevent duplicate spam submissions by using device lock tags.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.settings.ipRestriction || false}
                      onChange={(e) => {
                        const updated = {
                          ...form,
                          settings: { ...form.settings, ipRestriction: e.target.checked }
                        };
                        setForm(updated);
                        handleSaveForm(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Form Responses and Analytics Sheet */}
          {activeTab === "submissions" && (
            <div className="space-y-6">
              {/* Analytics header cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400 block font-semibold font-sans">{getTranslation(lang, "responses")}</span>
                    <h3 className="text-2xl font-bold font-mono text-white mt-1">{responses.length}</h3>
                  </div>
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400 block font-semibold font-sans">{getTranslation(lang, "views")}</span>
                    <h3 className="text-2xl font-bold font-mono text-white mt-1">{form.viewCount || 0}</h3>
                  </div>
                  <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400 block font-semibold font-sans">Live Excel Sync</span>
                    <h3 className="text-xs font-bold font-mono text-emerald-400 mt-1 uppercase flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{form.settings.autoExcelSync ? "ACTIVE" : "INACTIVE"}</span>
                    </h3>
                  </div>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Toolbar Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
                <span className="text-xs font-semibold text-slate-300 font-sans">
                  {responses.length === 0 ? getTranslation(lang, "noResponsesYet") : "Export and print controls:"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    disabled={responses.length === 0}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{getTranslation(lang, "downloadExcel")}</span>
                  </button>

                  <button
                    onClick={handlePrintLayout}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{getTranslation(lang, "downloadPDF")}</span>
                  </button>
                </div>
              </div>

              {/* Tabular Responses Sheet */}
              {responses.length > 0 && (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 overflow-hidden">
                  <h4 className="font-sans font-bold text-white text-md mb-4">{getTranslation(lang, "answersHeader")}</h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase">
                          <th className="py-2.5 px-3 font-semibold">{getTranslation(lang, "responseAt")}</th>
                          {form.questions.filter((q) => q.type !== QuestionType.SECTION).map((q) => (
                            <th key={q.id} className="py-2.5 px-3 font-semibold max-w-xs truncate">{q.title}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {responses.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-800/10">
                            <td className="py-3 px-3 text-slate-400 font-mono truncate">
                              {new Date(r.submittedAt).toLocaleString()}
                            </td>
                            {form.questions.filter((q) => q.type !== QuestionType.SECTION).map((q) => {
                              const ans = r.answers[q.id];
                              return (
                                <td key={q.id} className="py-3 px-3 text-slate-200">
                                  {ans === undefined || ans === null ? (
                                    <span className="text-slate-600">-</span>
                                  ) : q.type === QuestionType.SIGNATURE ? (
                                    <img src={ans} alt="Signature" className="h-8 max-w-[80px] bg-slate-950 border border-slate-800 rounded p-0.5 object-contain" />
                                  ) : q.type === QuestionType.FILE_UPLOAD ? (
                                    <a href={ans} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                                      Download File
                                    </a>
                                  ) : Array.isArray(ans) ? (
                                    <span>{ans.join(", ")}</span>
                                  ) : typeof ans === "boolean" ? (
                                    <span>{ans ? "Yes" : "No"}</span>
                                  ) : (
                                    <span className="truncate block max-w-xs">{String(ans)}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom "BORHAN" premium branding footer */}
          <div className="mt-16 mb-6 text-center border-t border-slate-800/40 pt-6 print:hidden">
            <p className="text-[10px] tracking-widest text-slate-600 font-mono uppercase">Crafted & Built By</p>
            <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 mt-1 drop-shadow-[0_2px_10px_rgba(99,102,241,0.2)] font-sans">
              BORHAN
            </h2>
            <p className="text-[9px] text-indigo-400 font-mono mt-0.5 tracking-wider">Collect | Organize | Analyze | Succeed</p>
          </div>

        </main>
      </div>

      {/* PRINT-ONLY EMBEDDED SHEET FOR EXCELLENT HARDCOPY EXPORTS */}
      <div className="hidden print:block p-10 bg-white text-black font-sans">
        <h1 className="text-3xl font-extrabold mb-1">{form.title}</h1>
        <p className="text-sm text-gray-600 mb-8 pb-4 border-b border-gray-300">{form.description}</p>

        <h3 className="text-lg font-bold mb-4">Questions Form Structure Layout</h3>
        <div className="space-y-6">
          {form.questions.map((q, idx) => (
            <div key={q.id} className="border border-gray-200 p-4 rounded-xl">
              <span className="text-xs text-gray-500 font-semibold uppercase">{q.type.replace("_", " ")}</span>
              <h4 className="text-md font-bold mt-1">{idx + 1}. {q.title} {q.required && <span className="text-red-500">*</span>}</h4>
              {q.description && <p className="text-xs text-gray-500 mt-1 italic">{q.description}</p>}

              {/* Options lists if appropriate */}
              {[QuestionType.MULTIPLE_CHOICE, QuestionType.CHECKBOXES, QuestionType.DROPDOWN].includes(q.type) && (
                <div className="mt-2.5 pl-4 space-y-1">
                  {q.options?.map((opt, optIdx) => (
                    <div key={opt.id} className="text-xs flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border border-gray-400"></div>
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
