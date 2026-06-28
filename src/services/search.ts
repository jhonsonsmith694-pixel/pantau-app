// Global Search Engine — search across all entities
import { Monitor, Note, Reminder } from '../types';
import { CONFIG } from '../config';

export type SearchableEntity = 'monitor' | 'note' | 'reminder' | 'all';

export type SearchResult<T = any> = {
  type: SearchableEntity;
  id: string | number;
  title: string;
  subtitle?: string;
  category?: string;
  data: T;
  score: number;
};

type Searchable = {
  id: string | number;
  title: string;
  content?: string;
  category?: string;
};

class SearchEngine {
  private recentSearches: string[] = [];
  private maxRecent: number = 20;

  // Full-text search across all entities
  search(
    query: string,
    entities: {
      monitors?: Monitor[];
      notes?: Note[];
      reminders?: Reminder[];
    },
    types: SearchableEntity[] = ['all'],
    limit: number = 20
  ): SearchResult[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results: SearchResult[] = [];

    const shouldSearch = (t: SearchableEntity) => types.includes('all') || types.includes(t);

    // Score a searchable item
    const score = (item: Searchable, field: keyof Searchable): number => {
      const val = String(item[field] || '').toLowerCase();
      const idx = val.indexOf(q);
      if (idx === 0) return 100 - (val.length - q.length); // prefix match
      if (idx > 0) return 80 - idx;                         // substring match
      // Word boundary
      if (val.split(/\s+/).some((w: string) => w.startsWith(q))) return 60;
      // Contains all words
      const words = q.split(/\s+/);
      if (words.every(w => val.includes(w))) return 40;
      if (words.some(w => val.includes(w))) return 20;
      return 0;
    };

    // Search monitors
    if (shouldSearch('monitor') && entities.monitors) {
      for (const m of entities.monitors) {
        const s = score(m, 'title');
        if (s > 0) {
          results.push({
            type: 'monitor',
            id: m.id,
            title: m.title,
            subtitle: m.category,
            category: m.category,
            data: m,
            score: s,
          });
        }
      }
    }

    // Search notes
    if (shouldSearch('note') && entities.notes) {
      for (const n of entities.notes) {
        const titleScore = score(n, 'title');
        const contentScore = n.content ? score(n as any, 'content') : 0;
        const maxScore = Math.max(titleScore, contentScore);
        if (maxScore > 0) {
          results.push({
            type: 'note',
            id: n.id,
            title: n.title,
            subtitle: n.content?.slice(0, 80),
            category: n.category,
            data: n,
            score: maxScore,
          });
        }
      }
    }

    // Search reminders
    if (shouldSearch('reminder') && entities.reminders) {
      for (const r of entities.reminders) {
        const s = score(r, 'title');
        if (s > 0) {
          results.push({
            type: 'reminder',
            id: r.id,
            title: r.title,
            subtitle: r.dueAt,
            data: r,
            score: s,
          });
        }
      }
    }

    // Sort by score descending, then by title
    results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

    return results.slice(0, limit);
  }

  // Filter results by category
  filterByCategory(results: SearchResult[], category?: string): SearchResult[] {
    if (!category || category === 'semua') return results;
    return results.filter(r => r.category === category || (r as any).data?.category === category);
  }

  // Recent searches
  addRecentSearch(query: string) {
    const q = query.trim();
    if (!q) return;
    this.recentSearches = this.recentSearches.filter(s => s !== q);
    this.recentSearches.unshift(q);
    if (this.recentSearches.length > this.maxRecent) this.recentSearches.pop();
  }

  getRecentSearches(): string[] {
    return [...this.recentSearches];
  }

  clearRecentSearches() {
    this.recentSearches = [];
  }

  // Highlight matching text (for rendering)
  highlight(text: string, query: string): { before: string; match: string; after: string } | null {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return null;
    return {
      before: text.slice(0, idx),
      match: text.slice(idx, idx + query.length),
      after: text.slice(idx + query.length),
    };
  }
}

export const searchEngine = new SearchEngine();
