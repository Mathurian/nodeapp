/**
 * Command Registry
 * Central registry for all application commands used in the command palette
 */

import { ReactNode } from 'react';

export interface Command {
  id: string;
  name: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action: () => void | Promise<void>;
  keywords: string[];
  category: 'navigation' | 'action' | 'admin' | 'quick' | 'search';
  roles?: string[]; // Roles that can see this command
  shortcut?: string; // Keyboard shortcut (e.g., 'Cmd+K')
  group?: string; // Group name for organization
  priority?: number; // Higher = shown first (default: 0)
  context?: string[]; // Which pages/contexts this appears in
  disabled?: boolean;
}

export interface CommandGroup {
  id: string;
  name: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * CommandRegistry manages all application commands
 * Provides search, filtering, and persistence of user preferences
 */
class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private groups: Map<string, CommandGroup> = new Map();
  private recentCommands: string[] = [];
  private favoriteCommands: Set<string> = new Set();
  private readonly MAX_RECENT = 10;
  private readonly STORAGE_KEY_RECENT = 'commandHistory';
  private readonly STORAGE_KEY_FAVORITES = 'commandFavorites';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Register a single command
   */
  register(command: Command): void {
    if (!command.id) {
      throw new Error('Command must have an id');
    }
    if (!command.name) {
      throw new Error('Command must have a name');
    }
    if (!command.action) {
      throw new Error('Command must have an action function');
    }

    this.commands.set(command.id, {
      ...command,
      keywords: command.keywords || [],
      category: command.category || 'action',
      priority: command.priority || 0
    });
  }

  /**
   * Register multiple commands at once
   */
  registerMany(commands: Command[]): void {
    commands.forEach(cmd => this.register(cmd));
  }

  /**
   * Unregister a command
   */
  unregister(commandId: string): void {
    this.commands.delete(commandId);
  }

  /**
   * Register a command group
   */
  registerGroup(group: CommandGroup): void {
    this.groups.set(group.id, group);
  }

  /**
   * Get all registered commands
   */
  getAll(): Command[] {
    return Array.from(this.commands.values())
      .filter(cmd => !cmd.disabled);
  }

  /**
   * Get a single command by ID
   */
  get(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Get commands filtered by user role
   */
  getByRole(role: string): Command[] {
    return this.getAll().filter(cmd =>
      !cmd.roles || cmd.roles.length === 0 || cmd.roles.includes(role)
    );
  }

  /**
   * Get commands filtered by context (current page/view)
   */
  getByContext(context: string): Command[] {
    return this.getAll().filter(cmd =>
      !cmd.context || cmd.context.length === 0 || cmd.context.includes(context)
    );
  }

  /**
   * Get commands filtered by category
   */
  getByCategory(category: Command['category']): Command[] {
    return this.getAll().filter(cmd => cmd.category === category);
  }

  /**
   * Search commands with fuzzy matching
   * Returns commands sorted by relevance
   */
  search(query: string, options?: {
    role?: string;
    context?: string;
    category?: Command['category'];
  }): Command[] {
    const lowerQuery = query.toLowerCase().trim();
    let commands = this.getAll();

    // Apply filters
    if (options?.role) {
      commands = commands.filter(cmd =>
        !cmd.roles || cmd.roles.length === 0 || cmd.roles.includes(options.role!)
      );
    }

    if (options?.context) {
      commands = commands.filter(cmd =>
        !cmd.context || cmd.context.length === 0 || cmd.context.includes(options.context!)
      );
    }

    if (options?.category) {
      commands = commands.filter(cmd => cmd.category === options.category);
    }

    // If no query, return all filtered commands sorted by priority
    if (!lowerQuery) {
      return commands.sort((a, b) => {
        // Favorites first
        const aFav = this.isFavorite(a.id);
        const bFav = this.isFavorite(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;

        // Then by priority
        return (b.priority || 0) - (a.priority || 0);
      });
    }

    // Search and rank by relevance
    const results = commands
      .map(cmd => {
        let score = 0;

        // Exact name match (highest priority)
        if (cmd.name.toLowerCase() === lowerQuery) {
          score += 1000;
        }
        // Name starts with query
        else if (cmd.name.toLowerCase().startsWith(lowerQuery)) {
          score += 500;
        }
        // Name contains query
        else if (cmd.name.toLowerCase().includes(lowerQuery)) {
          score += 100;
        }

        // Description match
        if (cmd.description?.toLowerCase().includes(lowerQuery)) {
          score += 50;
        }

        // Keywords match
        const keywordMatch = cmd.keywords.some(k =>
          k.toLowerCase().includes(lowerQuery)
        );
        if (keywordMatch) {
          score += 75;
        }

        // Group match
        if (cmd.group?.toLowerCase().includes(lowerQuery)) {
          score += 25;
        }

        // Boost for favorites
        if (this.isFavorite(cmd.id)) {
          score += 10;
        }

        // Boost for recently used
        const recentIndex = this.recentCommands.indexOf(cmd.id);
        if (recentIndex !== -1) {
          score += (this.MAX_RECENT - recentIndex) * 5;
        }

        // Add base priority
        score += (cmd.priority || 0);

        return { cmd, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => cmd);

    return results;
  }

  /**
   * Add command to recent history
   */
  addToRecent(commandId: string): void {
    if (!this.commands.has(commandId)) {
      return;
    }

    // Remove if already exists
    this.recentCommands = this.recentCommands.filter(id => id !== commandId);

    // Add to front
    this.recentCommands.unshift(commandId);

    // Limit to MAX_RECENT
    if (this.recentCommands.length > this.MAX_RECENT) {
      this.recentCommands = this.recentCommands.slice(0, this.MAX_RECENT);
    }

    this.saveToStorage();
  }

  /**
   * Get recent commands
   */
  getRecent(limit?: number): Command[] {
    const commands = this.recentCommands
      .map(id => this.commands.get(id))
      .filter((cmd): cmd is Command => cmd !== undefined && !cmd.disabled);

    return limit ? commands.slice(0, limit) : commands;
  }

  /**
   * Clear recent commands history
   */
  clearRecent(): void {
    this.recentCommands = [];
    this.saveToStorage();
  }

  /**
   * Toggle command as favorite
   */
  toggleFavorite(commandId: string): void {
    if (!this.commands.has(commandId)) {
      return;
    }

    if (this.favoriteCommands.has(commandId)) {
      this.favoriteCommands.delete(commandId);
    } else {
      this.favoriteCommands.add(commandId);
    }

    this.saveToStorage();
  }

  /**
   * Check if command is favorited
   */
  isFavorite(commandId: string): boolean {
    return this.favoriteCommands.has(commandId);
  }

  /**
   * Get all favorite commands
   */
  getFavorites(): Command[] {
    return Array.from(this.favoriteCommands)
      .map(id => this.commands.get(id))
      .filter((cmd): cmd is Command => cmd !== undefined && !cmd.disabled)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Clear all favorites
   */
  clearFavorites(): void {
    this.favoriteCommands.clear();
    this.saveToStorage();
  }

  /**
   * Get all registered groups
   */
  getGroups(): CommandGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get group by ID
   */
  getGroup(groupId: string): CommandGroup | undefined {
    return this.groups.get(groupId);
  }

  /**
   * Get commands grouped by their group property
   */
  getGroupedCommands(): Map<string, Command[]> {
    const grouped = new Map<string, Command[]>();

    this.getAll().forEach(cmd => {
      const groupKey = cmd.group || 'Other';
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(cmd);
    });

    // Sort commands within each group by priority
    grouped.forEach(commands => {
      commands.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    });

    return grouped;
  }

  /**
   * Execute a command by ID
   */
  async execute(commandId: string): Promise<void> {
    const command = this.commands.get(commandId);
    if (!command || command.disabled) {
      console.warn(`Command not found or disabled: ${commandId}`);
      return;
    }

    try {
      await command.action();
      this.addToRecent(commandId);
    } catch (error) {
      console.error(`Error executing command ${commandId}:`, error);
      throw error;
    }
  }

  /**
   * Save recent commands and favorites to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEY_RECENT,
        JSON.stringify(this.recentCommands)
      );
      localStorage.setItem(
        this.STORAGE_KEY_FAVORITES,
        JSON.stringify(Array.from(this.favoriteCommands))
      );
    } catch (error) {
      console.error('Failed to save command preferences:', error);
    }
  }

  /**
   * Load recent commands and favorites from localStorage
   */
  private loadFromStorage(): void {
    try {
      const recent = localStorage.getItem(this.STORAGE_KEY_RECENT);
      if (recent) {
        this.recentCommands = JSON.parse(recent);
      }

      const favorites = localStorage.getItem(this.STORAGE_KEY_FAVORITES);
      if (favorites) {
        this.favoriteCommands = new Set(JSON.parse(favorites));
      }
    } catch (error) {
      console.error('Failed to load command preferences:', error);
      this.recentCommands = [];
      this.favoriteCommands = new Set();
    }
  }

  /**
   * Clear all commands (useful for testing)
   */
  clear(): void {
    this.commands.clear();
    this.groups.clear();
  }

  /**
   * Get statistics about registered commands
   */
  getStats(): {
    totalCommands: number;
    byCategory: Record<string, number>;
    totalGroups: number;
    recentCount: number;
    favoritesCount: number;
  } {
    const byCategory: Record<string, number> = {};

    this.getAll().forEach(cmd => {
      byCategory[cmd.category] = (byCategory[cmd.category] || 0) + 1;
    });

    return {
      totalCommands: this.commands.size,
      byCategory,
      totalGroups: this.groups.size,
      recentCount: this.recentCommands.length,
      favoritesCount: this.favoriteCommands.size
    };
  }

  // ===== Alias methods for backward compatibility =====

  /**
   * Alias for registerMany() - for backward compatibility
   */
  registerCommands(commands: Command[]): void {
    this.registerMany(commands);
  }

  /**
   * Alias for execute() - for backward compatibility
   */
  async executeCommand(commandId: string): Promise<void> {
    return this.execute(commandId);
  }

  /**
   * Alias for getAll() - for backward compatibility
   */
  getAllCommands(): Command[] {
    return this.getAll();
  }

  /**
   * Alias for getRecent() - for backward compatibility
   */
  getRecentCommands(limit?: number): Command[] {
    return this.getRecent(limit);
  }

  /**
   * Alias for getFavorites() - for backward compatibility
   */
  getFavoriteCommands(): Command[] {
    return this.getFavorites();
  }

  /**
   * Add command to favorites - for backward compatibility
   */
  addFavorite(commandId: string): void {
    if (!this.commands.has(commandId)) {
      return;
    }
    this.favoriteCommands.add(commandId);
    this.saveToStorage();
  }

  /**
   * Remove command from favorites - for backward compatibility
   */
  removeFavorite(commandId: string): void {
    this.favoriteCommands.delete(commandId);
    this.saveToStorage();
  }
}

// Export singleton instance
export const commandRegistry = new CommandRegistry();

// Export class for testing
export { CommandRegistry };
