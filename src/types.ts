export enum QuestionType {
  SHORT_ANSWER = "short_answer",
  PARAGRAPH = "paragraph",
  MULTIPLE_CHOICE = "multiple_choice",
  CHECKBOXES = "checkboxes",
  DROPDOWN = "dropdown",
  NUMBERS = "numbers",
  EMAIL = "email",
  PHONE = "phone",
  DATE = "date",
  TIME = "time",
  FILE_UPLOAD = "file_upload",
  SIGNATURE = "signature",
  RATING = "rating",
  LINEAR_SCALE = "linear_scale",
  WEBSITE = "website",
  IMAGE_CHOICE = "image_choice",
  YES_NO = "yes_no",
  SECTION = "section"
}

export interface QuestionOption {
  id: string;
  label: string;
  image?: string; // Optional image base64
}

export interface ConditionalLogic {
  enabled: boolean;
  questionId: string;
  operator: "equals" | "not_equals" | "contains" | "has_value";
  value: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: QuestionOption[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  conditionalLogic?: ConditionalLogic;
}

export interface FormSettings {
  isActive: boolean;
  limitResponses: number; // 0 for unlimited
  closeMessage: string;
  autoExcelSync: boolean;
  redirectUrl?: string;
  emailNotification?: boolean;
  progressBar?: boolean;
  ipRestriction?: boolean;
  customSubmitText?: string;
  saveLater?: boolean;
  autoJump?: boolean;
  passwordProtect?: boolean;
  formPassword?: string;
}

export interface FormTheme {
  preset: "dark-glow-indigo" | "dark-glow-rose" | "dark-glow-emerald" | "dark-glow-cyan" | "light-glow-indigo" | "light-glow-rose" | "light-glow-emerald" | "retro-terminal";
  glowColor: "indigo" | "rose" | "emerald" | "cyan" | "violet" | "amber";
}

export interface Form {
  id: string;
  userId: string;
  title: string;
  description: string;
  questions: Question[];
  settings: FormSettings;
  theme: FormTheme;
  createdAt: string;
  viewCount: number;
  responsesCount?: number;
}

export interface FormResponse {
  id: string;
  formId: string;
  answers: Record<string, any>;
  language: string;
  submittedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}
