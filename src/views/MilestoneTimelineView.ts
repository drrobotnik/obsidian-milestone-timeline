import { ItemView, WorkspaceLeaf, TFile, MarkdownView } from 'obsidian';
import type MilestoneTimelinePlugin from '../main';
import { VIEW_TYPE_MILESTONE_TIMELINE, LOCALIZATIONS } from '../constants';
import type { Milestone, LocalizationConfig } from '../types';
import MilestoneTimelineHelpModal from '../modals/HelpModal';

export default class MilestoneTimelineView extends ItemView {
    plugin: MilestoneTimelinePlugin;
    searchInput: HTMLInputElement | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: MilestoneTimelinePlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_MILESTONE_TIMELINE;
    }

    getDisplayText(): string {
        return 'Milestone Timeline';
    }

    getIcon(): string {
        return 'calendar-clock';
    }

    async onOpen() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('milestone-timeline-container');

        // Render header once (it won't be re-rendered)
        this.renderHeader(container);
        
        // Create timeline content container
        const timelineContent = container.createDiv('milestone-timeline-content');
        
        // Render initial timeline
        await this.renderTimelineContent(timelineContent);
    }

    renderHeader(container: HTMLElement) {
        const header = container.createDiv('milestone-timeline-header');
        header.createEl('h4', { text: 'Milestone Timeline' });

        const headerButtons = header.createDiv('milestone-header-buttons');
        
        // Add search input
        const searchContainer = headerButtons.createDiv('milestone-search-container');
        this.searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: 'Search timeline...',
            cls: 'milestone-search-input'
        });
        
        this.searchInput.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const timelineContent = container.querySelector('.milestone-timeline-content') as HTMLElement;
            if (timelineContent) {
                void this.renderTimelineContent(timelineContent, target.value);
            }
        });
        
        // Add help button
        const helpBtn = headerButtons.createEl('button', {
            text: '?',
            cls: 'milestone-help-btn',
            attr: { 'aria-label': 'Help' }
        });
        helpBtn.addEventListener('click', () => {
            new MilestoneTimelineHelpModal(this.app).open();
        });
        
        // Add refresh button
        const refreshBtn = headerButtons.createEl('button', {
            text: 'Refresh',
            cls: 'milestone-refresh-btn'
        });
        refreshBtn.addEventListener('click', () => {
            const timelineContent = container.querySelector('.milestone-timeline-content') as HTMLElement;
            if (timelineContent && this.searchInput) {
                void this.renderTimelineContent(timelineContent, this.searchInput.value);
            }
        });
    }

    async renderTimelineContent(timelineContent: HTMLElement, searchQuery?: string) {
        // Clear only the timeline content, not the header
        timelineContent.empty();

        // Extract milestones from all markdown files
        const allMilestones = await this.extractMilestones();
        
        // Filter milestones based on search query
        let milestones = allMilestones;
        if (searchQuery && searchQuery.trim().length > 0) {
            milestones = this.filterMilestones(allMilestones, searchQuery.trim());
        }

        if (milestones.length === 0) {
            const emptyMessage = searchQuery && searchQuery.trim().length > 0
                ? `No milestones found matching "${searchQuery}". Found ${allMilestones.length} total milestones.`
                : 'No milestones found. Add dates in your notes using formats like YYYY-MM-DD, [[YYYY-MM-DD]], or frontmatter.';
            timelineContent.createDiv({
                text: emptyMessage,
                cls: 'milestone-empty-state'
            });
            return;
        }
        
        // Show search results count if filtering
        if (searchQuery && searchQuery.trim().length > 0) {
            const resultCount = timelineContent.createDiv('milestone-search-results');
            resultCount.setText(`Showing ${milestones.length} of ${allMilestones.length} milestones`);
        }

        // Sort milestones
        milestones.sort((a, b) => {
            const order = this.plugin.settings.sortOrder === 'asc' ? 1 : -1;
            return (a.date.getTime() - b.date.getTime()) * order;
        });

        // Count milestones per year to determine if we need month markers
        const milestonesPerYear = new Map<number, number>();
        for (const milestone of milestones) {
            const year = milestone.date.getFullYear();
            milestonesPerYear.set(year, (milestonesPerYear.get(year) || 0) + 1);
        }

        // Create timeline
        const timeline = timelineContent.createDiv('milestone-timeline');

        let previousYear: number | null = null;
        let previousMonth: number | null = null;
        let currentYearHasMonthMarkers = false;

        for (const milestone of milestones) {
            const currentYear = milestone.date.getFullYear();
            const currentMonth = milestone.date.getMonth();
            
            // Check if this year should have month markers
            const yearMilestoneCount = milestonesPerYear.get(currentYear) || 0;
            const shouldShowMonthMarkers = yearMilestoneCount >= this.plugin.settings.monthThreshold;
            
            // Determine if we should show year markers
            // Show by default, but respect the sub-setting when year-only extraction is enabled
            const shouldShowYearMarkers = !this.plugin.settings.includeYearOnly || this.plugin.settings.showYearMarkersWithYearOnly;
            
            // Add year marker if year changed
            if (shouldShowYearMarkers && previousYear !== null && previousYear !== currentYear) {
                const yearMarker = timeline.createDiv('milestone-year-marker');
                const yearMarkerDot = yearMarker.createDiv('milestone-year-marker-dot');
                this.createSvgElement(yearMarkerDot, '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor"/><circle cx="12" cy="12" r="4" fill="var(--background-primary)"/></svg>');
                const yearContent = yearMarker.createDiv('milestone-year-content');
                yearContent.createDiv('milestone-year-line');
                yearContent.createDiv('milestone-year-label').setText(`${currentYear}`);
                yearContent.createDiv('milestone-year-line');
                previousMonth = null; // Reset month tracking for new year
                currentYearHasMonthMarkers = shouldShowMonthMarkers;
            } else if (shouldShowYearMarkers && previousYear === null) {
                // Add year marker for the very first item
                const yearMarker = timeline.createDiv('milestone-year-marker');
                const yearMarkerDot = yearMarker.createDiv('milestone-year-marker-dot');
                this.createSvgElement(yearMarkerDot, '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor"/><circle cx="12" cy="12" r="4" fill="var(--background-primary)"/></svg>');
                const yearContent = yearMarker.createDiv('milestone-year-content');
                yearContent.createDiv('milestone-year-line');
                yearContent.createDiv('milestone-year-label').setText(`${currentYear}`);
                yearContent.createDiv('milestone-year-line');
                currentYearHasMonthMarkers = shouldShowMonthMarkers;
            }
            
            // Add month marker if month changed and year has enough milestones
            if (currentYearHasMonthMarkers && 
                (previousMonth === null || previousMonth !== currentMonth)) {
                const monthMarker = timeline.createDiv('milestone-month-marker');
                const monthMarkerDot = monthMarker.createDiv('milestone-month-marker-dot');
                this.createSvgElement(monthMarkerDot, '<svg width="16" height="16" viewBox="0 0 16 16"><rect x="4" y="4" width="8" height="8" fill="currentColor" rx="2"/></svg>');
                const monthLabel = monthMarker.createDiv('milestone-month-label');
                monthLabel.setText(this.getMonthName(currentMonth));
            }
            
            previousYear = currentYear;
            previousMonth = currentMonth;

            const item = timeline.createDiv('milestone-item');

            const marker = item.createDiv('milestone-marker');
            marker.createDiv('milestone-dot');

            const content = item.createDiv('milestone-content');
            
            const dateStr = this.formatMilestoneDate(milestone);
            const dateEl = content.createDiv('milestone-date');
            
            // Add partial date class for info styling
            if (milestone.isUncertain) {
                dateEl.addClass('milestone-date-partial');
            }
            
            dateEl.setText(dateStr);
            
            // Add uncertainty indicator if this milestone has uncertain date
            if (milestone.isUncertain) {
                const uncertainIndicator = dateEl.createSpan('milestone-uncertain-indicator');
                uncertainIndicator.setText(' ~');
                uncertainIndicator.title = 'Approximate or incomplete date';
            }
            
            // Add tag indicator if this milestone is from a tag
            if (milestone.isTag) {
                const tagIndicator = dateEl.createSpan('milestone-tag-indicator');
                this.createSvgElement(tagIndicator, '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>');
                tagIndicator.title = 'From date tag';
            }

            if (this.plugin.settings.showFileLinks) {
                const titleEl = content.createEl('a', {
                    text: milestone.title,
                    cls: 'milestone-title internal-link'
                });
                
                // Set data attributes for Obsidian's link handling
                titleEl.setAttribute('data-href', milestone.file.path);
                titleEl.setAttribute('href', milestone.file.path);
                
                // Add hover preview support (Ctrl+hover like in file sidebar)
                titleEl.addEventListener('mouseover', (e) => {
                    this.app.workspace.trigger('hover-link', {
                        event: e,
                        source: 'milestone-timeline',
                        hoverParent: this,
                        targetEl: titleEl,
                        linktext: milestone.file.path,
                        sourcePath: milestone.file.path
                    });
                });
                
                titleEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Wrap async logic in IIFE to avoid returning Promise to event listener
                    void (async () => {
                        // Open the file
                        const leaf = this.app.workspace.getLeaf(false);
                        await leaf.openFile(milestone.file);
                        
                        // Jump to the specific line if available
                        if (milestone.lineNumber !== undefined) {
                            // Wait for the editor to be ready
                            await new Promise(resolve => globalThis.setTimeout(resolve, 100));
                            
                            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                            if (activeView && activeView.editor) {
                                const editor = activeView.editor;
                                editor.setCursor({ line: milestone.lineNumber, ch: 0 });
                                editor.scrollIntoView({ from: { line: milestone.lineNumber, ch: 0 }, to: { line: milestone.lineNumber, ch: 0 } }, true);
                            }
                        }
                    })();
                });
            } else {
                content.createDiv({
                    text: milestone.title,
                    cls: 'milestone-title'
                });
            }

            if (milestone.heading) {
                content.createDiv({
                    text: milestone.heading,
                    cls: 'milestone-heading'
                });
            }

            if (milestone.context) {
                const contextEl = content.createDiv({
                    cls: 'milestone-context'
                });
                // Render wiki-links as clickable internal links
                this.renderWikiLinks(contextEl, milestone.context);
            }
        }
    }

    async extractMilestones(): Promise<Milestone[]> {
        const milestones: Milestone[] = [];
        const files = this.app.vault.getMarkdownFiles();

        for (const file of files) {
            const content = await this.app.vault.read(file);
            const extractedMilestones = this.extractDatesFromContent(content, file);
            milestones.push(...extractedMilestones);
        }

        return milestones;
    }

    filterMilestones(milestones: Milestone[], query: string): Milestone[] {
        const lowerQuery = query.toLowerCase();
        
        return milestones.filter(milestone => {
            // Search in title (filename)
            if (this.fuzzyMatch(milestone.title.toLowerCase(), lowerQuery)) {
                return true;
            }
            
            // Search in context (line containing date)
            if (milestone.context && this.fuzzyMatch(milestone.context.toLowerCase(), lowerQuery)) {
                return true;
            }
            
            // Search in heading
            if (milestone.heading && this.fuzzyMatch(milestone.heading.toLowerCase(), lowerQuery)) {
                return true;
            }
            
            // Search in formatted date
            const dateStr = this.formatDate(milestone.date);
            if (this.fuzzyMatch(dateStr, lowerQuery)) {
                return true;
            }
            
            // Search in file path
            if (this.fuzzyMatch(milestone.file.path.toLowerCase(), lowerQuery)) {
                return true;
            }
            
            return false;
        });
    }
    
    fuzzyMatch(text: string, query: string): boolean {
        // Simple fuzzy matching: check if all characters of query appear in order in text
        let queryIndex = 0;
        
        for (let i = 0; i < text.length && queryIndex < query.length; i++) {
            if (text[i] === query[queryIndex]) {
                queryIndex++;
            }
        }
        
        // Also do a simple substring match for better UX
        return queryIndex === query.length || text.includes(query);
    }

    renderWikiLinks(contextEl: HTMLElement, text: string) {
        // Pattern to match wiki-links: [[link]] or [[link|display text]]
        const wikiLinkPattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
        
        let lastIndex = 0;
        let match;
        
        while ((match = wikiLinkPattern.exec(text)) !== null) {
            // Add text before the link
            if (match.index > lastIndex) {
                contextEl.appendText(text.substring(lastIndex, match.index));
            }
            
            const linkPath = match[1];
            const displayText = match[2] || linkPath;
            
            // Create a clickable internal link
            const linkEl = contextEl.createEl('a', {
                text: displayText,
                cls: 'internal-link'
            });
            
            linkEl.setAttribute('data-href', linkPath);
            linkEl.setAttribute('href', linkPath);
            
            // Add hover preview support
            linkEl.addEventListener('mouseover', (e) => {
                this.app.workspace.trigger('hover-link', {
                    event: e,
                    source: 'milestone-timeline',
                    hoverParent: this,
                    targetEl: linkEl,
                    linktext: linkPath,
                    sourcePath: ''
                });
            });
            
            linkEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Wrap async logic in IIFE to avoid returning Promise to event listener
                void (async () => {
                    // Try to find and open the file
                    const file = this.app.metadataCache.getFirstLinkpathDest(linkPath, '');
                    if (file) {
                        const leaf = this.app.workspace.getLeaf(false);
                        await leaf.openFile(file);
                    }
                })();
            });
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining text after the last link
        if (lastIndex < text.length) {
            contextEl.appendText(text.substring(lastIndex));
        }
    }

    extractContentExcerpt(content: string, maxLength: number = 100): string {
        // Remove frontmatter
        const contentWithoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');
        
        // Remove Obsidian comments
        const contentWithoutComments = contentWithoutFrontmatter.replace(/%%[\s\S]*?%%/g, '');
        
        // Split into lines and find first meaningful content
        const lines = contentWithoutComments.split('\n');
        let excerpt = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip empty lines, headings, and horizontal rules
            if (!trimmed || trimmed.startsWith('#') || trimmed.match(/^[-*_]{3,}$/)) {
                continue;
            }
            
            // Skip lines that are just links or embeds
            if (trimmed.match(/^!\[\[.*\]\]$/) || trimmed.match(/^\[\[.*\]\]$/)) {
                continue;
            }
            
            // Found meaningful content
            excerpt += (excerpt ? ' ' : '') + trimmed;
            
            // Stop if we have enough content
            if (excerpt.length >= maxLength) {
                break;
            }
        }
        
        // Truncate if needed
        if (excerpt.length > maxLength) {
            excerpt = excerpt.substring(0, maxLength) + '...';
        } else if (excerpt.length > 0 && excerpt.length < maxLength) {
            // Add ellipsis if there's more content in the note
            const hasMoreContent = contentWithoutComments.length > excerpt.length + 100;
            if (hasMoreContent) {
                excerpt += '...';
            }
        }
        
        return excerpt || 'No content preview available';
    }

    parseDateMultiLocale(dateStr: string, formatPreference: 'US' | 'International' = 'US', primaryLocale?: LocalizationConfig): { date: Date; isPartial: boolean } | null {
        // Try parsing with the primary locale first
        if (primaryLocale) {
            const result = this.parseDate(dateStr, formatPreference, primaryLocale);
            if (result) return result;
        }
        
        // If primary locale failed or wasn't provided, try all other locales
        // This allows parsing dates in any supported language regardless of the selected timeline language
        for (const localeName in LOCALIZATIONS) {
            const locale = LOCALIZATIONS[localeName];
            // Skip if this is the same as primary locale (already tried)
            if (primaryLocale && locale === primaryLocale) continue;
            
            const result = this.parseDate(dateStr, formatPreference, locale);
            if (result) return result;
        }
        
        return null;
    }

    extractDatesFromContent(content: string, file: TFile): Milestone[] {
        const milestones: Milestone[] = [];
        const seenDates = new Set<string>(); // Track date+context combinations to avoid duplicates
        const seenDateTimestamps = new Set<number>(); // Track date timestamps to avoid frontmatter+inline duplicates
        
        // Get localization config
        const locale = LOCALIZATIONS[this.plugin.settings.language] || LOCALIZATIONS['en'];
        
        // Check for note-specific date format preference in frontmatter
        let noteDateFormatPreference: 'US' | 'International' = this.plugin.settings.dateFormatPreference;
        let isNoteUncertain = false;
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            
            // Check for dateFormat override
            const dateFormatMatch = frontmatter.match(/^dateFormat:\s*(.+)$/im);
            if (dateFormatMatch) {
                const formatValue = dateFormatMatch[1].trim().toLowerCase();
                if (formatValue === 'us' || formatValue === 'm/d/yyyy' || formatValue === 'mdy') {
                    noteDateFormatPreference = 'US';
                } else if (formatValue === 'international' || formatValue === 'd/m/yyyy' || formatValue === 'dmy') {
                    noteDateFormatPreference = 'International';
                }
            }
            
            // Check for dateUncertain flag
            const uncertainMatch = frontmatter.match(/^dateUncertain:\s*(.+)$/im);
            if (uncertainMatch) {
                const uncertainValue = uncertainMatch[1].trim().toLowerCase();
                isNoteUncertain = uncertainValue === 'true' || uncertainValue === 'yes';
            }
            
            const dateFields = ['date', 'created', 'modified', 'milestone', 'deadline', 'due'];
            
            for (const field of dateFields) {
                const regex = new RegExp(`^${field}:\\s*(.+)$`, 'im');
                const match = frontmatter.match(regex);
                if (match) {
                    // Remove quotes from date string (both single and double)
                    const dateStr = match[1].trim().replace(/^["']|["']$/g, '');
                    // Try parsing with all locales to support multilingual notes
                    const parseResult = this.parseDateMultiLocale(dateStr, noteDateFormatPreference, locale);
                    if (parseResult) {
                        const timestamp = parseResult.date.getTime();
                        const key = `${timestamp}-frontmatter-${field}`;
                        if (!seenDates.has(key)) {
                            seenDates.add(key);
                            seenDateTimestamps.add(timestamp);
                            // Use content excerpt as context instead of just showing the date field
                            const excerpt = this.extractContentExcerpt(content);
                            milestones.push({
                                date: parseResult.date,
                                title: file.basename,
                                file,
                                context: excerpt,
                                // Note-level uncertain flag applies to frontmatter dates
                                isUncertain: isNoteUncertain || parseResult.isPartial
                            });
                        }
                    }
                }
            }
        }

        // Remove frontmatter from content for inline extraction to avoid double-counting
        const contentWithoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');
        
        // Remove Obsidian comments from content (both single-line and multi-line)
        // This handles %% comment %% and %% multi
        // line
        // comment %%
        const contentWithoutComments = contentWithoutFrontmatter.replace(/%%[\s\S]*?%%/g, '');
        
        const lines = contentWithoutComments.split('\n');
        
        // Calculate line offset (how many lines the frontmatter took)
        const frontmatterLines = content.split('\n').length - contentWithoutComments.split('\n').length;
        
        // Track the current heading as we scan through lines
        let currentHeading: string | undefined = undefined;
        
        // Extract inline dates - multiple formats
        // Pattern 1: YYYY-MM-DD or YYYY-M-D format (but not in wiki-links, we'll handle those separately)
        const isoPattern = /(?<!\[\[)\b(\d{4}-\d{1,2}-\d{1,2})\b(?!\]\])/g;
        
        // Build patterns for ALL locales to support multilingual content
        const allLocalePatterns: Array<{pattern: RegExp, locale: LocalizationConfig}> = [];
        
        for (const localeName in LOCALIZATIONS) {
            const loc = LOCALIZATIONS[localeName];
            const ordPattern = loc.ordinalSuffixes?.pattern || '';
            
            // Month DD, YYYY pattern for this locale
            const monthDayYear = ordPattern 
                ? new RegExp(`\\b((${loc.monthPatterns.any})\\s+\\d{1,2}(?:${ordPattern})?,?\\s+\\d{4})\\b`, 'gi')
                : new RegExp(`\\b((${loc.monthPatterns.any})\\s+\\d{1,2},?\\s+\\d{4})\\b`, 'gi');
            allLocalePatterns.push({pattern: monthDayYear, locale: loc});
            
            // Month YYYY pattern for this locale
            const monthYear = new RegExp(`\\b((${loc.monthPatterns.any})\\s+\\d{4})\\b`, 'gi');
            allLocalePatterns.push({pattern: monthYear, locale: loc});
        }
        
        // Pattern 2c: Obsidian incomplete dates with placeholders - must have at least one dd/mm/yyyy literal
        // This pattern is handled separately in parseDate and should not be in the main patterns array
        // Examples: "05/dd/1985", "dd/05/1985", "mm/15/1985"
        
        // Pattern 3: Numeric dates with 4-digit year (e.g., "5-3-1918", "12/31/2024")
        // Note: These are interpreted based on format preference (US: M/D/YYYY, Intl: D/M/YYYY)
        const numericDatePattern = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/g;
        
        // Pattern 3b: Numeric dates with 2-digit year (e.g., "1-17-79", "12/31/95")
        // Interpreted as: 00-29 → 2000-2029, 30-99 → 1930-1999
        const numericDatePattern2Digit = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2})\b/g;

        // Heading pattern
        const headingPattern = /^(#{1,6})\s+(.+)$/;
        
        // Image embed pattern to detect any markdown image
        const imageEmbedPattern = /!\[\[([^\]]+)\]\]/g;
        
        // Tag date pattern: #date/YYYY/MM/DD
        const tagDatePattern = /#date\/(\d{4})\/(\d{2})\/(\d{2})\b/g;
        
        // Year tag pattern: #year/YYYY (for year-only annotations)
        const yearTagPattern = /#year\/(1[0-9]\d{2}|20\d{2}|2100)\b/g;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const actualLineNumber = i + frontmatterLines;
            
            // Check if this line is a heading
            const headingMatch = line.match(headingPattern);
            if (headingMatch) {
                currentHeading = headingMatch[2].trim();
                continue;
            }
            
            // Extract tag dates if enabled
            if (this.plugin.settings.includeTagDates) {
                tagDatePattern.lastIndex = 0;
                let tagMatch;
                
                while ((tagMatch = tagDatePattern.exec(line)) !== null) {
                    const year = tagMatch[1];
                    const month = tagMatch[2];
                    const day = tagMatch[3];
                    const dateStr = `${year}-${month}-${day}`;
                    const parseResult = this.parseDate(dateStr, noteDateFormatPreference, locale);
                    
                    if (parseResult) {
                        const timestamp = parseResult.date.getTime();
                        
                        // Skip if this exact date already exists in frontmatter
                        if (seenDateTimestamps.has(timestamp)) {
                            continue;
                        }
                        
                        // Extract context (the line containing the tag)
                        let context = line.replace(/^#+\s*/, '').trim();
                        if (context.length > 100) {
                            context = context.substring(0, 100) + '...';
                        }
                        
                        const key = `${timestamp}-${i}-tag-${dateStr}`;
                        if (!seenDates.has(key)) {
                            seenDates.add(key);
                            milestones.push({
                                date: parseResult.date,
                                title: file.basename,
                                file,
                                context,
                                heading: currentHeading,
                                lineNumber: actualLineNumber,
                                isTag: true,
                                // Only mark as uncertain if the date itself is partial
                                isUncertain: parseResult.isPartial
                            });
                        }
                    }
                }
            }
            
            // Extract year-only tag dates if enabled
            if (this.plugin.settings.includeTagDates) {
                yearTagPattern.lastIndex = 0;
                let yearTagMatch;
                
                while ((yearTagMatch = yearTagPattern.exec(line)) !== null) {
                    const year = yearTagMatch[1];
                    const dateStr = `${year}-01-01`; // Use January 1st as representative date
                    const parseResult = this.parseDate(dateStr, noteDateFormatPreference, locale);
                    
                    if (parseResult) {
                        const timestamp = parseResult.date.getTime();
                        
                        // Skip if this exact date already exists
                        if (seenDateTimestamps.has(timestamp)) {
                            continue;
                        }
                        
                        // Extract context (the line containing the tag)
                        let context = line.replace(/^#+\s*/, '').trim();
                        if (context.length > 100) {
                            context = context.substring(0, 100) + '...';
                        }
                        
                        const key = `${timestamp}-${i}-yeartag-${year}`;
                        if (!seenDates.has(key)) {
                            seenDates.add(key);
                            milestones.push({
                                date: parseResult.date,
                                title: file.basename,
                                file,
                                context,
                                heading: currentHeading,
                                lineNumber: actualLineNumber,
                                isTag: true,
                                // Mark as partial since it's year-only
                                isUncertain: true
                            });
                        }
                    }
                }
            }
            
            // Extract inline dates from patterns
            // Include universal patterns (ISO, numeric) and all locale-specific patterns
            const universalPatterns = [
                {pattern: isoPattern, locale: null},
                {pattern: numericDatePattern, locale: null},
                {pattern: numericDatePattern2Digit, locale: null}
            ];
            
            const patterns = [...universalPatterns, ...allLocalePatterns];
            
            // Year-only pattern is no longer automatically extracted due to ambiguity
            // Users should use #year/YYYY tags to explicitly mark year-only dates
            // if (this.plugin.settings.includeYearOnly) {
            //     patterns.push({pattern: yearOnlyPattern, locale: null});
            // }
            
            // Track matched positions to avoid overlapping matches
            const matchedRanges: Array<{start: number, end: number}> = [];
            
            for (const patternInfo of patterns) {
                patternInfo.pattern.lastIndex = 0; // Reset regex
                let match;
                
                while ((match = patternInfo.pattern.exec(line)) !== null) {
                    const dateStr = match[1];
                    const matchIndex = match.index;
                    const matchEnd = matchIndex + match[0].length;
                    
                    // Skip if this position overlaps with a previously matched range
                    let overlaps = false;
                    for (const range of matchedRanges) {
                        if (matchIndex < range.end && matchEnd > range.start) {
                            overlaps = true;
                            break;
                        }
                    }
                    if (overlaps) {
                        continue;
                    }
                    
                    // Skip if excludeScreenshots is enabled and this date is inside an image embed
                    if (this.plugin.settings.excludeScreenshots) {
                        let isInImageEmbed = false;
                        imageEmbedPattern.lastIndex = 0;
                        let embedMatch;
                        
                        while ((embedMatch = imageEmbedPattern.exec(line)) !== null) {
                            const embedStart = embedMatch.index;
                            const embedEnd = embedStart + embedMatch[0].length;
                            
                            // Check if our date match falls within this image embed
                            if (matchIndex >= embedStart && matchIndex < embedEnd) {
                                isInImageEmbed = true;
                                break;
                            }
                        }
                        
                        if (isInImageEmbed) {
                            continue;
                        }
                    }
                    
                    // Use the pattern's locale if specified, otherwise try multi-locale parsing
                    const parseResult = patternInfo.locale 
                        ? this.parseDate(dateStr, noteDateFormatPreference, patternInfo.locale)
                        : this.parseDateMultiLocale(dateStr, noteDateFormatPreference, locale);
                    
                    if (parseResult) {
                        const timestamp = parseResult.date.getTime();
                        
                        // Skip if this exact date already exists in frontmatter
                        if (seenDateTimestamps.has(timestamp)) {
                            continue;
                        }
                        
                        // Extract context (the line containing the date)
                        let context = line.replace(/^#+\s*/, '').trim();
                        if (context.length > 100) {
                            context = context.substring(0, 100) + '...';
                        }
                        
                        // Create unique key based on date timestamp and line content
                        const key = `${timestamp}-${i}-${context}`;
                        if (!seenDates.has(key)) {
                            seenDates.add(key);
                            // Track this matched range to prevent overlapping matches
                            matchedRanges.push({start: matchIndex, end: matchEnd});
                            milestones.push({
                                date: parseResult.date,
                                title: file.basename,
                                file,
                                context,
                                heading: currentHeading,
                                lineNumber: actualLineNumber,
                                // Only mark as uncertain if the date itself is partial
                                isUncertain: parseResult.isPartial
                            });
                        }
                    }
                }
            }
        }

        // Extract wiki-link dates - support various formats with localized months from ALL languages
        // Build a combined pattern for all locales
        const allMonthPatterns = Object.values(LOCALIZATIONS)
            .map(loc => loc.monthPatterns.any)
            .join('|');
        const wikiDatePattern = new RegExp(`\\[\\[([\\d-]+|(${allMonthPatterns})\\s+\\d{4})\\]\\]`, 'gi');
        let wikiMatch;
        
        while ((wikiMatch = wikiDatePattern.exec(contentWithoutFrontmatter)) !== null) {
            const dateStr = wikiMatch[1];
            // Use multi-locale parsing to handle dates in any supported language
            const parseResult = this.parseDateMultiLocale(dateStr, noteDateFormatPreference, locale);
            
            if (parseResult) {
                const context = `Wiki link: [[${dateStr}]]`;
                const key = `${parseResult.date.getTime()}-wiki-${dateStr}`;
                if (!seenDates.has(key)) {
                    seenDates.add(key);
                    milestones.push({
                        date: parseResult.date,
                        title: file.basename,
                        file,
                        context,
                        // Only mark as uncertain if the date itself is partial
                        isUncertain: parseResult.isPartial
                    });
                }
            }
        }

        return milestones;
    }

    parseDate(dateStr: string, formatPreference: 'US' | 'International' = 'US', locale?: LocalizationConfig): { date: Date; isPartial: boolean } | null {
        // Use default English locale if not provided
        if (!locale) {
            locale = LOCALIZATIONS['en'];
        }
        
        // Clean up the date string
        const cleanStr = dateStr.trim();
        
        // Remove locale-specific ordinal suffixes from dates for parsing
        // e.g., "April 10th, 1992" (English) → "April 10, 1992"
        //       "1er Mai 2024" (French) → "1 Mai 2024"
        //       "15º de Enero" (Spanish) → "15 de Enero"
        let cleanedForParsing = cleanStr;
        if (locale.ordinalSuffixes?.pattern) {
            const ordinalPattern = new RegExp(`(\\d{1,2})(${locale.ordinalSuffixes.pattern})\\b`, 'gi');
            cleanedForParsing = cleanedForParsing.replace(ordinalPattern, '$1');
        }
        
        // Check for incomplete date with placeholders (e.g., "05/dd/1985", "dd/05/1985")
        // Only process if there are actual placeholder literals (dd, mm, yyyy)
        const hasPlaceholders = /(dd|DD|mm|MM|yyyy|YYYY)/i.test(cleanedForParsing);
        const incompleteDatePattern = /^(\d{1,2}|dd|DD|mm|MM)[-/](\d{1,2}|dd|DD|mm|MM)[-/](\d{4}|yyyy|YYYY)$/i;
        const incompleteMatch = cleanedForParsing.match(incompleteDatePattern);
        
        if (incompleteMatch && hasPlaceholders) {
            const first = incompleteMatch[1];
            const second = incompleteMatch[2];
            const third = incompleteMatch[3];
            
            // Check if year is a placeholder
            if (third.toLowerCase() === 'yyyy') {
                return null; // Can't parse without a year
            }
            
            const year = parseInt(third);
            if (year < 1000 || year > 2100) {
                return null;
            }
            
            // Parse based on format preference
            let month: number | null = null;
            let day: number = 15; // Default to mid-month/mid-day
            
            if (formatPreference === 'US') {
                // US: M/D/YYYY
                if (first.toLowerCase() === 'mm') {
                    month = 6; // Default to July (mid-year)
                } else {
                    month = parseInt(first);
                }
                
                if (second.toLowerCase() !== 'dd') {
                    day = parseInt(second);
                }
            } else {
                // International: D/M/YYYY
                if (first.toLowerCase() !== 'dd') {
                    day = parseInt(first);
                }
                
                if (second.toLowerCase() === 'mm') {
                    month = 6; // Default to July (mid-year)
                } else {
                    month = parseInt(second);
                }
            }
            
            // Validate month
            if (month < 1 || month > 12) {
                return null;
            }
            
            // Create date (0-indexed month for JS Date)
            return { date: new Date(year, month - 1, day), isPartial: true };
        }
        
        // Check for partial date: Month YYYY (e.g., "May 1985", "March 2001", "Mayo 1985")
        const monthYearTextPattern = new RegExp(`^(${locale.monthPatterns.any})\\s+(\\d{4})$`, 'i');
        const monthYearTextMatch = cleanedForParsing.match(monthYearTextPattern);
        if (monthYearTextMatch) {
            const monthStr = monthYearTextMatch[1];
            const year = parseInt(monthYearTextMatch[2]);
            
            // Parse month name to number using localized map
            const month = locale.monthNameMap[monthStr.toLowerCase()];
            
            if (month !== undefined && year >= 1000 && year <= 2100) {
                // Default to 15th (mid-month) for month-year dates
                return { date: new Date(year, month, 15), isPartial: true };
            }
            return null;
        }
        
        // Check for partial date: Year only (YYYY)
        const yearOnlyPattern = /^(\d{4})$/;
        const yearOnlyMatch = cleanedForParsing.match(yearOnlyPattern);
        if (yearOnlyMatch) {
            const year = parseInt(yearOnlyMatch[1]);
            if (year >= 1000 && year <= 2100) {
                // Default to July 1 (mid-year) for year-only dates
                return { date: new Date(year, 6, 1), isPartial: true };
            }
            return null;
        }
        
        // Check for partial date: Year-Month (YYYY-MM)
        const yearMonthPattern = /^(\d{4})-(\d{1,2})$/;
        const yearMonthMatch = cleanedForParsing.match(yearMonthPattern);
        if (yearMonthMatch) {
            const year = parseInt(yearMonthMatch[1]);
            const month = parseInt(yearMonthMatch[2]);
            if (year >= 1000 && year <= 2100 && month >= 1 && month <= 12) {
                // Default to 15th (mid-month) for year-month dates
                return { date: new Date(year, month - 1, 15), isPartial: true };
            }
            return null;
        }
        
        // Check if this is an ambiguous numeric date (M/D/YYYY or D/M/YYYY)
        const numericPattern = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
        const numericMatch = cleanedForParsing.match(numericPattern);
        
        if (numericMatch) {
            const first = parseInt(numericMatch[1]);
            const second = parseInt(numericMatch[2]);
            const year = parseInt(numericMatch[3]);
            
            let month: number, day: number;
            
            if (formatPreference === 'US') {
                // US format: M/D/YYYY
                month = first;
                day = second;
            } else {
                // International format: D/M/YYYY
                day = first;
                month = second;
            }
            
            // Validate month and day ranges
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1000 && year <= 2100) {
                // JavaScript Date uses 0-indexed months
                const date = new Date(year, month - 1, day);
                
                // Verify the date is valid (handles invalid dates like Feb 31)
                if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
                    return { date, isPartial: false };
                }
            }
            
            return null;
        }
        
        // Check for 2-digit year format (M/D/YY or D/M/YY) - e.g., "1-17-79"
        const numericPattern2Digit = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/;
        const numericMatch2Digit = cleanedForParsing.match(numericPattern2Digit);
        
        if (numericMatch2Digit) {
            const first = parseInt(numericMatch2Digit[1]);
            const second = parseInt(numericMatch2Digit[2]);
            let yearShort = parseInt(numericMatch2Digit[3]);
            
            // Convert 2-digit year to 4-digit year
            // Convention: 00-29 → 2000-2029, 30-99 → 1930-1999
            const year = yearShort >= 30 ? 1900 + yearShort : 2000 + yearShort;
            
            let month: number, day: number;
            
            if (formatPreference === 'US') {
                // US format: M/D/YY
                month = first;
                day = second;
            } else {
                // International format: D/M/YY
                day = first;
                month = second;
            }
            
            // Validate month and day ranges
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                // JavaScript Date uses 0-indexed months
                const date = new Date(year, month - 1, day);
                
                // Verify the date is valid (handles invalid dates like Feb 31)
                if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
                    return { date, isPartial: false };
                }
            }
            
            return null;
        }
        
        // For non-ambiguous formats, use JavaScript's Date constructor
        // This handles formats like:
        // - "YYYY-MM-DD" (unambiguous ISO format)
        // - "March 31, 2001" (unambiguous natural language)
        // - "Aug 23 1931" (unambiguous natural language)
        // - "April 10th, 1992" (with ordinal suffixes removed)
        const date = new Date(cleanedForParsing);
        
        // Validate the date is valid
        if (!isNaN(date.getTime())) {
            // Additional validation: check if year is reasonable (1900-2100)
            const year = date.getFullYear();
            if (year >= 1000 && year <= 2100) {
                return { date, isPartial: false };
            }
        }

        return null;
    }

    formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    formatMilestoneDate(milestone: Milestone): string {
        const date = milestone.date;
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        
        // If uncertain/partial, show simplified format
        if (milestone.isUncertain) {
            // Check if it's year-only (July 1st indicates year-only default)
            if (month === 6 && day === 1) {
                return `${year}`;
            }
            // Check if it's month-year (15th indicates month-year default)
            if (day === 15) {
                const locale = LOCALIZATIONS[this.plugin.settings.language] || LOCALIZATIONS['en'];
                const monthName = locale.monthNames.full[month];
                return `${monthName} ${year}`;
            }
        }
        
        // Otherwise show full date
        return this.formatDate(date);
    }

    getMonthName(monthIndex: number): string {
        const locale = LOCALIZATIONS[this.plugin.settings.language] || LOCALIZATIONS['en'];
        return locale.monthNames.full[monthIndex];
    }

    private createSvgElement(container: HTMLElement, svgString: string): void {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svgElement = doc.documentElement;
        if (svgElement && svgElement.tagName.toLowerCase() === 'svg') {
            container.appendChild(svgElement);
        }
    }

    async onClose() {
        // Cleanup if needed
    }

    async refresh() {
        const container = this.containerEl.children[1] as HTMLElement;
        if (container) {
            const timelineContent = container.querySelector('.milestone-timeline-content') as HTMLElement;
            if (timelineContent && this.searchInput) {
                await this.renderTimelineContent(timelineContent, this.searchInput.value);
            }
        }
    }
}
