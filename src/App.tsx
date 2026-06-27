import React, { useState, useEffect } from "react";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import FormBuilder from "./components/FormBuilder";
import FormFiller from "./components/FormFiller";
import FormQRCode from "./components/FormQRCode";
import { Form, User } from "./types";
import { getApiUrl } from "./utils/api";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("formflow_token"));
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<string>("EN");
  const [forms, setForms] = useState<Form[]>([]);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  
  // Public form routing detection
  const [publicFormId, setPublicFormId] = useState<string | null>(null);
  
  // QR modal state
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: "",
    title: ""
  });

  const [loading, setLoading] = useState(true);

  // Parse path, query, or hash on initial mount to check if it's a public form view
  useEffect(() => {
    // 1. Check pathname (e.g., /form/123)
    const path = window.location.pathname;
    const match = path.match(/\/form\/([a-zA-Z0-9_\-]+)/);
    if (match && match[1]) {
      setPublicFormId(match[1]);
      setLoading(false);
      return;
    }

    // 2. Check query search parameters (e.g., ?form=123 or ?id=123)
    const params = new URLSearchParams(window.location.search);
    const queryFormId = params.get("form") || params.get("id");
    if (queryFormId) {
      setPublicFormId(queryFormId);
      setLoading(false);
      return;
    }

    // 3. Check hash (e.g., #/form/123 or #form=123)
    const hash = window.location.hash;
    const hashMatch = hash.match(/\/form\/([a-zA-Z0-9_\-]+)/) || hash.match(/form=([a-zA-Z0-9_\-]+)/);
    if (hashMatch && hashMatch[1]) {
      setPublicFormId(hashMatch[1]);
      setLoading(false);
      return;
    }

    setLoading(false);
  }, []);

  // Fetch logged-in user profile & forms on mount or token change
  useEffect(() => {
    if (publicFormId) return; // Skip auth fetch if viewing a public form

    const fetchProfileAndForms = async () => {
      if (!token) {
        setUser(null);
        setForms([]);
        return;
      }

      try {
        // Fetch current user
        const profileRes = await fetch(getApiUrl("/api/auth/me"), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const profileData = await profileRes.json();
        if (!profileRes.ok) {
          throw new Error(profileData.error);
        }
        setUser(profileData.user);

        // Fetch user's forms list
        const formsRes = await fetch(getApiUrl("/api/forms"), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const formsData = await formsRes.json();
        if (formsRes.ok) {
          setForms(formsData);
        }
      } catch (err) {
        console.error("Session restored failed", err);
        handleLogout();
      }
    };

    fetchProfileAndForms();
  }, [token, publicFormId]);

  const handleAuthSuccess = (newToken: string, newUser: User) => {
    localStorage.setItem("formflow_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("formflow_token");
    setToken(null);
    setUser(null);
    setEditingFormId(null);
    setForms([]);
  };

  const handleCreateForm = async () => {
    if (!token) return;
    try {
      const res = await fetch(getApiUrl("/api/forms"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: "Unnamed Form",
          description: "Form description...",
          questions: [],
          settings: {
            isActive: true,
            limitResponses: 0,
            closeMessage: "This form is closed.",
            autoExcelSync: true
          },
          theme: {
            preset: "dark-glow-indigo",
            glowColor: "indigo"
          }
        })
      });

      const newForm = await res.json();
      if (res.ok) {
        setForms((prev) => [newForm, ...prev]);
        setEditingFormId(newForm.id);
      }
    } catch (err) {
      console.error("Failed to create form", err);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this form and all its submissions? This cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/api/forms/${formId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setForms((prev) => prev.filter((f) => f.id !== formId));
      }
    } catch (err) {
      console.error("Failed to delete form", err);
    }
  };

  const triggerOpenQR = (url: string, title: string) => {
    setQrModal({ isOpen: true, url, title });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060814] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // PUBLIC FORM VIEW ROUTE (Zero-auth required)
  if (publicFormId) {
    return <FormFiller formId={publicFormId} lang={lang} setLang={setLang} />;
  }

  // DEVELOPER PORTAL VIEW ROUTES (Auth protected)
  if (!token || !user) {
    return <Auth onAuthSuccess={handleAuthSuccess} lang={lang} setLang={setLang} />;
  }

  // Active form builder editor workspace route
  if (editingFormId) {
    return (
      <FormBuilder
        formId={editingFormId}
        token={token}
        onBack={() => {
          setEditingFormId(null);
          // Refetch forms to update submission count metrics
          fetch(getApiUrl("/api/forms"), {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then((res) => res.json())
            .then((data) => setForms(data));
        }}
        lang={lang}
      />
    );
  }

  // Standard Developer Dashboard Route
  return (
    <>
      <Dashboard
        forms={forms}
        user={user}
        onCreateForm={handleCreateForm}
        onEditForm={(id) => setEditingFormId(id)}
        onDeleteForm={handleDeleteForm}
        onOpenQR={triggerOpenQR}
        onLogout={handleLogout}
        lang={lang}
        setLang={setLang}
      />

      {/* Embedded share QR Modal dialog */}
      {qrModal.isOpen && (
        <FormQRCode
          url={qrModal.url}
          title={qrModal.title}
          onClose={() => setQrModal({ isOpen: false, url: "", title: "" })}
        />
      )}
    </>
  );
}
