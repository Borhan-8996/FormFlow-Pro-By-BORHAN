import React, { useState } from "react";
import {
  FileText,
  Eye,
  MessageSquare,
  Percent,
  Plus,
  Trash2,
  ExternalLink,
  QrCode,
  Globe,
  LogOut,
  Calendar,
  Share2,
  Languages,
  Sparkles
} from "lucide-react";
import { motion } from "motion/react";
import { getTranslation } from "../utils/translate";
import { Form } from "../types";

interface DashboardProps {
  forms: Form[];
  user: { id: string; name: string; email: string };
  onCreateForm: () => void;
  onEditForm: (formId: string) => void;
  onDeleteForm: (formId: string) => void;
  onOpenQR: (url: string, title: string) => void;
  onLogout: () => void;
  lang: string;
  setLang: (lang: string) => void;
}

export default function Dashboard({
  forms,
  user,
  onCreateForm,
  onEditForm,
  onDeleteForm,
  onOpenQR,
  onLogout,
  lang,
  setLang
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate Metrics
  const totalForms = forms.length;
  const totalViews = forms.reduce((acc, f) => acc + (f.viewCount || 0), 0);
  const totalResponses = forms.reduce((acc, f) => acc + (f.responsesCount || 0), 0);
  const completionRate = totalViews > 0 ? Math.round((totalResponses / totalViews) * 100) : 0;

  // Filtered Forms
  const filteredForms = forms.filter((f) =>
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // SVG Area Chart Data Generation for Last 7 Days
  const chartPoints = [20, 45, 28, 80, 55, 95, 68]; // Custom high-quality mock trend points representing the UI mockup
  const chartLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Calculate SVG line path coordinates
  const chartWidth = 500;
  const chartHeight = 120;
  const padding = 20;
  const pointsCount = chartPoints.length;
  const xStep = (chartWidth - padding * 2) / (pointsCount - 1);
  const maxVal = Math.max(...chartPoints) * 1.1;
  const minVal = 0;

  const svgPoints = chartPoints.map((val, idx) => {
    const x = padding + idx * xStep;
    const y = chartHeight - padding - ((val - minVal) / (maxVal - minVal)) * (chartHeight - padding * 2);
    return { x, y, val };
  });

  const linePath = svgPoints.reduce((acc, p, idx) => {
    return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
  }, "");

  const areaPath = linePath ? `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${chartHeight - padding} L ${svgPoints[0].x} ${chartHeight - padding} Z` : "";

  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-[#080a1c] border-r border-slate-800/60 p-6 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_25px_rgba(139,92,246,0.45)] border border-indigo-300/30 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-transparent to-rose-500/20 rotate-45 group-hover:rotate-180 transition-transform duration-1000"></div>
              <Sparkles className="w-5 h-5 text-white relative z-10 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white leading-tight tracking-tight">FormFlow Pro</h2>
              <span className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase">Built By BORHAN</span>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-4 mb-6">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-2">Logged Developer</div>
            <div className="text-sm font-semibold text-slate-200 truncate">{user.name}</div>
            <div className="text-xs text-indigo-400 font-mono truncate">{user.email}</div>
          </div>

          <div className="space-y-1.5">
            <button className="w-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium text-sm px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all">
              <FileText className="w-4 h-4" />
              <span>{getTranslation(lang, "myForms")}</span>
            </button>
          </div>
        </div>

        {/* Footer controls inside sidebar */}
        <div className="mt-8 pt-4 border-t border-slate-800/60 space-y-3">
          {/* Language Selection */}
          <button
            onClick={() => setLang(lang === "EN" ? "BN" : "EN")}
            className="w-full bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-300"
          >
            <span className="flex items-center gap-2">
              <Languages className="w-3.5 h-3.5 text-cyan-400" />
              <span>Language / ভাষা</span>
            </span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-indigo-400 uppercase font-mono">
              {lang}
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border border-rose-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{getTranslation(lang, "logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        {/* Top Header Rail */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans">
              {getTranslation(lang, "dashboard")}
            </h1>
            <p className="text-sm text-slate-400 font-sans mt-1">
              {lang === "EN" ? "Overview of form data collection metrics" : "ফর্ম তথ্য সংগ্রহ মেট্রিক্সের সংক্ষিপ্ত বিবরণ"}
            </p>
          </div>
          <button
            onClick={onCreateForm}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_20px_rgba(99,102,241,0.45)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{getTranslation(lang, "createNewForm")}</span>
          </button>
        </div>

        {/* Analytics Dashboard Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Forms */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700/60 transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-400 font-sans uppercase tracking-wider font-semibold">
                  {getTranslation(lang, "forms")}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-white font-sans mt-2">{totalForms}</h3>
              </div>
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Total Responses */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700/60 transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-400 font-sans uppercase tracking-wider font-semibold">
                  {getTranslation(lang, "responses")}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-white font-sans mt-2">{totalResponses}</h3>
              </div>
              <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Total Views */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700/60 transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-400 font-sans uppercase tracking-wider font-semibold">
                  {getTranslation(lang, "views")}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-white font-sans mt-2">{totalViews}</h3>
              </div>
              <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
                <Eye className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700/60 transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-400 font-sans uppercase tracking-wider font-semibold">
                  {getTranslation(lang, "completionRate")}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-white font-sans mt-2">{completionRate}%</h3>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Percent className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* SVG Trend Line Chart */}
          <div
            className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative"
            style={{ boxShadow: "0 0 30px rgba(0,0,0,0.2)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-sans">
                  {lang === "EN" ? "Responses Trend" : "উত্তরসমূহ ট্রেন্ড"}
                </h3>
                <span className="text-xs text-slate-500 font-sans">
                  {lang === "EN" ? "Submission frequency past week" : "গত সপ্তাহের জমা দেওয়ার হার"}
                </span>
              </div>
              <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full font-mono">
                +14.2% {lang === "EN" ? "Live" : "লাইভ"}
              </span>
            </div>

            {/* Render Custom Responsive SVG Line/Area Chart */}
            <div className="w-full overflow-hidden mt-4">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto overflow-visible"
              >
                <defs>
                  <linearGradient id="gradientGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#1e293b" strokeDasharray="3" strokeWidth="0.5" />
                <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="#1e293b" strokeDasharray="3" strokeWidth="0.5" />
                <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#1e293b" strokeWidth="1" />

                {/* Area Gradient under curve */}
                {areaPath && <path d={areaPath} fill="url(#gradientGlow)" />}

                {/* Line Path */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0px 2px 8px rgba(99,102,241,0.5))" }}
                  />
                )}

                {/* Interaction Dots and value tooltips */}
                {svgPoints.map((p, idx) => (
                  <g key={idx} className="group/dot">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="5"
                      fill="#060814"
                      stroke="#818cf8"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="9"
                      fill="#818cf8"
                      fillOpacity="0"
                      className="cursor-pointer hover:fill-opacity-10 transition-all duration-200"
                    />
                    <text
                      x={p.x}
                      y={p.y - 10}
                      textAnchor="middle"
                      fill="#c7d2fe"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      className="opacity-0 group-hover/dot:opacity-100 transition-opacity bg-slate-950 px-1 py-0.5 rounded duration-200"
                    >
                      {p.val}
                    </text>
                  </g>
                ))}

                {/* X labels */}
                {svgPoints.map((p, idx) => (
                  <text
                    key={idx}
                    x={p.x}
                    y={chartHeight - 4}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="sans-serif"
                  >
                    {chartLabels[idx]}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* Platform Info Box */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-sans mb-3">
                {lang === "EN" ? "Real-Time Sync" : "রিয়েল-টাইম সিঙ্ক"}
              </h3>
              <p className="text-xs text-slate-400 font-sans leading-relaxed mb-4">
                {lang === "EN"
                  ? "FormFlow Pro uses lightweight database sync pipelines. Submitted public form responses are compiled instantly and can be sync-linked with Microsoft Excel & CSV on the fly."
                  : "ফর্মফ্লো প্রো ডাটাবেস সিঙ্ক পাইপলাইন ব্যবহার করে। জমা দেওয়া উত্তরসমূহ তাৎক্ষণিকভাবে এক্সেল বা সিএসভি শিটের সাথে সংযুক্ত করা যায়।"}
              </p>
            </div>
            
            <div className="p-4 bg-slate-950 border border-slate-800/60 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block uppercase">Status</span>
                <span className="text-xs text-slate-300 font-sans font-semibold">
                  {lang === "EN" ? "Platform Engine Online" : "প্ল্যাটফর্ম ইঞ্জিন অনলাইন"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Table Row */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h3 className="font-sans font-bold text-white text-lg">
              {getTranslation(lang, "recentForms")}
            </h3>
            
            {/* Search Input */}
            <input
              type="text"
              placeholder={lang === "EN" ? "Search forms..." : "ফর্ম অনুসন্ধান করুন..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 font-sans max-w-xs w-full"
            />
          </div>

          {filteredForms.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800/60 rounded-2xl bg-slate-950/20">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="font-sans font-semibold text-slate-400 text-sm">{getTranslation(lang, "noForms")}</h4>
              <p className="text-xs text-slate-500 font-sans mt-1 max-w-xs mx-auto">
                {getTranslation(lang, "createFirstForm")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs text-slate-400 uppercase font-mono">
                    <th className="py-3 px-4 font-semibold">{getTranslation(lang, "title")}</th>
                    <th className="py-3 px-4 font-semibold">{getTranslation(lang, "responses")}</th>
                    <th className="py-3 px-4 font-semibold">{getTranslation(lang, "views")}</th>
                    <th className="py-3 px-4 font-semibold">{lang === "EN" ? "Created" : "তৈরি হয়েছে"}</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm font-sans">
                  {filteredForms.map((form) => {
                    const basePath = window.location.pathname.split('/form/')[0].replace(/\/$/, "");
                    const isStaticHosting = window.location.hostname.includes("github.io") || window.location.hostname.includes("pages.dev");
                    const formPublicUrl = isStaticHosting
                      ? `${window.location.origin}${basePath}/?form=${form.id}`
                      : `${window.location.origin}${basePath}/form/${form.id}`;
                    const formPreviewUrl = isStaticHosting
                      ? `${basePath}/?form=${form.id}`
                      : `${basePath}/form/${form.id}`;
                    return (
                      <tr key={form.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-4 font-semibold text-slate-200">
                          <div>
                            <span>{form.title || getTranslation(lang, "unnamedForm")}</span>
                            <span className="text-[10px] block font-normal text-slate-500 font-sans truncate max-w-xs">
                              {form.description || "No description"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-300">
                          <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-400 font-mono font-bold">
                            {form.responsesCount || 0}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-300 font-mono text-xs">
                          {form.viewCount || 0}
                        </td>
                        <td className="py-4 px-4 text-slate-400 font-mono text-xs">
                          {new Date(form.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Responses / Edit Button */}
                            <button
                              onClick={() => onEditForm(form.id)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold font-sans transition-all cursor-pointer"
                            >
                              Edit / Responses
                            </button>

                            {/* Public Link Button */}
                            <a
                              href={formPreviewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                              title="Open Public Form"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            {/* Share QR Code Button */}
                            <button
                              onClick={() => onOpenQR(formPublicUrl, form.title)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                              title="Get QR Code"
                            >
                              <QrCode className="w-4 h-4 text-cyan-400" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => onDeleteForm(form.id)}
                              className="p-1.5 bg-slate-800 hover:bg-rose-900/30 text-slate-500 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                              title="Delete Form"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Custom "BORHAN" premium branding footer */}
        <div className="mt-16 mb-6 text-center border-t border-slate-800/40 pt-6">
          <p className="text-[10px] tracking-widest text-slate-600 font-mono uppercase">Crafted & Built By</p>
          <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 mt-1 drop-shadow-[0_2px_10px_rgba(99,102,241,0.2)] font-sans">
            BORHAN
          </h2>
          <p className="text-[9px] text-indigo-400 font-mono mt-0.5 tracking-wider">Collect | Organize | Analyze | Succeed</p>
        </div>
      </main>
    </div>
  );
}
