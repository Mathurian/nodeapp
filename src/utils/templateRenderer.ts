import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from './logger';
import { env } from '../config/env';

/**
 * Template Rendering Utility
 *
 * Provides Handlebars template rendering for email and other content
 *
 * Features:
 * - Template caching for performance
 * - Custom helper functions
 * - Support for partials
 * - Type-safe template data
 */
export class TemplateRenderer {
  private logger: Logger;
  private templateCache: Map<string, HandlebarsTemplateDelegate>;
  private templateDir: string;

  constructor(templateDir?: string) {
    this.logger = new Logger('TemplateRenderer');
    this.templateCache = new Map();
    this.templateDir = templateDir || path.join(
      process.cwd(),
      env.get('EMAIL_TEMPLATE_DIR') || 'src/templates/email'
    );

    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date | string, format?: string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!d || isNaN(d.getTime())) {
        return '';
      }

      if (format === 'short') {
        return d.toLocaleDateString();
      } else if (format === 'long') {
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } else if (format === 'time') {
        return d.toLocaleTimeString();
      } else {
        return d.toLocaleString();
      }
    });

    // Conditional comparison helper
    Handlebars.registerHelper('ifEquals', function (this: any, arg1: any, arg2: any, options: any) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // Number formatting helper
    Handlebars.registerHelper('formatNumber', (num: number, decimals: number = 0) => {
      if (typeof num !== 'number' || isNaN(num)) {
        return '0';
      }
      return num.toFixed(decimals);
    });

    // Uppercase helper
    Handlebars.registerHelper('uppercase', (str: string) => {
      return typeof str === 'string' ? str.toUpperCase() : '';
    });

    // Lowercase helper
    Handlebars.registerHelper('lowercase', (str: string) => {
      return typeof str === 'string' ? str.toLowerCase() : '';
    });

    // Join array helper
    Handlebars.registerHelper('join', (arr: any[], separator: string = ', ') => {
      return Array.isArray(arr) ? arr.join(separator) : '';
    });

    // Default value helper
    Handlebars.registerHelper('default', (value: any, defaultValue: any) => {
      return value !== undefined && value !== null && value !== '' ? value : defaultValue;
    });
  }

  /**
   * Load and compile a template file
   */
  private async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    try {
      const templatePath = path.join(this.templateDir, templateName);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const compiled = Handlebars.compile(templateContent);

      // Cache the compiled template
      this.templateCache.set(templateName, compiled);

      this.logger.info('Template loaded and cached', { templateName });

      return compiled;
    } catch (error) {
      this.logger.error('Failed to load template', {
        templateName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Template not found: ${templateName}`);
    }
  }

  /**
   * Render a template with data
   *
   * @param templateName - Name of the template file (e.g., 'welcome.html')
   * @param data - Template data/context
   * @returns Rendered HTML string
   */
  async render(templateName: string, data: Record<string, any> = {}): Promise<string> {
    try {
      const template = await this.loadTemplate(templateName);

      // Add default data that should be available in all templates
      const contextData = {
        ...data,
        appName: data['appName'] || env.get('APP_NAME') || 'Event Manager',
        appUrl: data['appUrl'] || env.get('APP_URL') || 'http://localhost:3000',
        supportEmail: data['supportEmail'] || env.get('SMTP_FROM') || 'support@example.com',
        currentYear: new Date().getFullYear(),
      };

      const rendered = template(contextData);

      this.logger.debug('Template rendered successfully', {
        templateName,
        dataKeys: Object.keys(data),
      });

      return rendered;
    } catch (error) {
      this.logger.error('Failed to render template', {
        templateName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Render a template string (not from file)
   *
   * @param templateString - Template string with Handlebars syntax
   * @param data - Template data/context
   * @returns Rendered string
   */
  renderString(templateString: string, data: Record<string, any> = {}): string {
    try {
      const template = Handlebars.compile(templateString);
      return template(data);
    } catch (error) {
      this.logger.error('Failed to render template string', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Clear template cache
   * Useful for development or when templates are updated
   */
  clearCache(templateName?: string): void {
    if (templateName) {
      this.templateCache.delete(templateName);
      this.logger.info('Template cache cleared', { templateName });
    } else {
      this.templateCache.clear();
      this.logger.info('All template cache cleared');
    }
  }

  /**
   * Check if a template exists
   */
  async templateExists(templateName: string): Promise<boolean> {
    try {
      const templatePath = path.join(this.templateDir, templateName);
      await fs.access(templatePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all available templates
   */
  async listTemplates(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.templateDir);
      return files.filter(f => f.endsWith('.html') || f.endsWith('.hbs'));
    } catch (error) {
      this.logger.error('Failed to list templates', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Register a partial template
   * Partials are reusable template components
   */
  async registerPartial(name: string, templateName: string): Promise<void> {
    try {
      const templatePath = path.join(this.templateDir, templateName);
      const partialContent = await fs.readFile(templatePath, 'utf-8');
      Handlebars.registerPartial(name, partialContent);
      this.logger.info('Partial registered', { name, templateName });
    } catch (error) {
      this.logger.error('Failed to register partial', {
        name,
        templateName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

/**
 * Singleton instance for global use
 */
export const templateRenderer = new TemplateRenderer();

/**
 * Convenience function for rendering templates
 */
export async function renderTemplate(
  templateName: string,
  data: Record<string, any> = {}
): Promise<string> {
  return templateRenderer.render(templateName, data);
}

/**
 * Convenience function for rendering template strings
 */
export function renderTemplateString(
  templateString: string,
  data: Record<string, any> = {}
): string {
  return templateRenderer.renderString(templateString, data);
}

export default templateRenderer;
