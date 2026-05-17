export type ScoreSheetTemplateKey = 'education_saturday_day_v1';

export type ScoreSheetTemplateCriterion = {
  label: string;
  aliases: string[];
};

export type ScoreSheetTemplateDefinition = {
  key: ScoreSheetTemplateKey;
  displayName: string;
  supported: boolean;
  scoreColumns: readonly number[];
  criteria: ScoreSheetTemplateCriterion[];
  grid: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    cellHorizontalPadding: number;
    cellVerticalPadding: number;
    minCellInkScore: number;
    minConfidenceGap: number;
  };
};

export const normalizeScoreSheetLabel = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const educationCriteria: ScoreSheetTemplateCriterion[] = [
  { label: 'Knowledge', aliases: ['knowledge'] },
  { label: 'Technique', aliases: ['technique'] },
  { label: 'Safety', aliases: ['safety'] },
  { label: 'Attitude', aliases: ['attitude'] },
  { label: 'Personality Projection', aliases: ['personality projection'] },
  { label: 'Volume', aliases: ['volume'] },
  { label: 'Audience Engagement', aliases: ['audience engagement'] },
  { label: 'Appropriate Attire', aliases: ['appropriate attire'] },
  { label: 'Preparation', aliases: ['preparation'] },
  {
    label: 'Time Management',
    aliases: ['time management', 'time management 60 minute class'],
  },
];

export const scoreSheetImportTemplates: ScoreSheetTemplateDefinition[] = [
  {
    key: 'education_saturday_day_v1',
    displayName: 'Education',
    supported: true,
    scoreColumns: [6, 5, 4, 3, 2, 1, 0] as const,
    criteria: educationCriteria,
    grid: {
      left: 0.327,
      right: 0.986,
      top: 0.318,
      bottom: 0.803,
      cellHorizontalPadding: 0.14,
      cellVerticalPadding: 0.1,
      minCellInkScore: 0.0011,
      minConfidenceGap: 0.05,
    },
  },
];

export const scoreSheetImportTemplateMap = new Map(
  scoreSheetImportTemplates.map((template) => [template.key, template] as const),
);

const matchesAlias = (normalizedValue: string, alias: string): boolean =>
  normalizedValue === alias
  || normalizedValue.startsWith(`${alias} `)
  || alias.startsWith(`${normalizedValue} `);

export const getTemplateCriterionMatchAlias = (
  templateCriterion: ScoreSheetTemplateCriterion,
  criterionName: string,
): string | null => {
  const normalizedCriterionName = normalizeScoreSheetLabel(criterionName);

  for (const alias of templateCriterion.aliases) {
    if (matchesAlias(normalizedCriterionName, alias)) {
      return alias;
    }
  }

  return null;
};

export const templateMatchesCriteria = (
  template: ScoreSheetTemplateDefinition,
  criterionNames: string[],
): boolean => {
  if (criterionNames.length !== template.criteria.length) {
    return false;
  }

  const unmatchedCriteria = new Set(criterionNames);

  for (const templateCriterion of template.criteria) {
    const match = Array.from(unmatchedCriteria).find(
      (criterionName) => getTemplateCriterionMatchAlias(templateCriterion, criterionName) !== null,
    );

    if (!match) {
      return false;
    }

    unmatchedCriteria.delete(match);
  }

  return unmatchedCriteria.size === 0;
};

export const resolveTemplateByCriteria = (
  criterionNames: string[],
): ScoreSheetTemplateDefinition | null => {
  for (const template of scoreSheetImportTemplates) {
    if (template.supported && templateMatchesCriteria(template, criterionNames)) {
      return template;
    }
  }

  return null;
};
