export interface PrintTemplate {
  name: string;
  filename: string;
  path: string;
}

export interface PrintTemplateInput {
  name: string;
  content: string;
  description?: string;
  type?: string;
}

export type PrintFormat = 'pdf' | 'html';

export interface PrintEventReportInput {
  eventId: string;
  templateName?: string;
  format?: PrintFormat;
  options?: Record<string, any>;
}

export interface PrintContestResultsInput {
  contestId: string;
  templateName?: string;
  format?: PrintFormat;
  options?: Record<string, any>;
}

export interface PrintJudgePerformanceInput {
  judgeId: string;
  eventId?: string;
  templateName?: string;
  format?: PrintFormat;
  options?: Record<string, any>;
}

export interface PrintOutput {
  content: Buffer;
  contentType: string;
  filename: string;
}

export interface ScoreDistribution {
  [range: string]: number;
}

export interface PerformanceStats {
  totalScores: number;
  averageScore: number;
  scoreDistribution: ScoreDistribution;
  categoriesJudged: number;
}
