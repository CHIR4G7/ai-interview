export interface Interview  {
  _id: Object;
  userId: string;
  jobDesc: string;
  skills: string[];
  companyName: string;
  projectContext: string[];
  workExDetails: string[];
  jobTitle:string;
  createdAt:Date;
  status:string;
  /** True once inngest has written the graded report. Derived, not stored. */
  insightsReady?: boolean;
}
export interface InterviewCardProps {
  interview: Interview;
}

export type Question = {
    question: string,
    expectedAnswer: string
}