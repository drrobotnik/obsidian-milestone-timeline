import { App, Modal, TFile, MarkdownRenderer, Component } from 'obsidian';
import type MilestoneTimelinePlugin from '../main';

interface YearMatch {
    year: string;
    file: TFile;
    lineNumber: number;
    context: string;
}

export default class PotentialYearsModal extends Modal {
    plugin: MilestoneTimelinePlugin;
    matches: YearMatch[];
    currentIndex: number = 0;

    constructor(app: App, plugin: MilestoneTimelinePlugin, matches: YearMatch[]) {
        super(app);
        this.plugin = plugin;
        this.matches = matches;
    }

    onOpen() {
        void this.renderMatch();
    }

    async renderMatch() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('milestone-years-modal');

        if (this.matches.length === 0) {
            const markdown = `
# All done!

No more potential year references to review.
`;
            const component = new Component();
            component.load();
            
            await MarkdownRenderer.render(this.app, markdown, contentEl, '', component);
            
            const closeBtn = contentEl.createEl('button', { text: 'Close' });
            closeBtn.addEventListener('click', () => this.close());
            return;
        }

        const match = this.matches[this.currentIndex];

        // Header with title and progress
        const header = contentEl.createDiv('potential-years-header');
        header.createEl('h2', { text: 'Potential date reference' });
        header.createEl('span', { 
            text: `${this.currentIndex + 1} / ${this.matches.length}`,
            cls: 'potential-years-progress'
        });

        // Year display - large centered number
        const yearDiv = contentEl.createDiv('potential-years-year-display');
        yearDiv.createEl('div', { text: match.year, cls: 'potential-years-year-number' });

        // File info with clickable link
        const fileInfo = contentEl.createDiv('potential-years-file-info');
        const fileLink = fileInfo.createEl('a', { text: match.file.basename, cls: 'potential-years-file-link' });
        fileLink.href = '#';
        fileLink.addEventListener('click', (e) => {
            e.preventDefault();
            const leaf = this.app.workspace.getLeaf(false);
            void leaf.openFile(match.file, { eState: { line: match.lineNumber - 1 } });
        });
        fileInfo.createEl('span', { text: ` (Line ${match.lineNumber})` });

        // Context with highlighted year
        const contextDiv = contentEl.createDiv('potential-years-context');
        const highlightedContext = match.context.replace(
            new RegExp(`\\b${match.year}\\b`, 'g'),
            `<mark>${match.year}</mark>`
        );
        // eslint-disable-next-line @microsoft/sdl/no-inner-html -- Highlighting year matches with mark tags
        contextDiv.innerHTML = highlightedContext;

        // Instructions as markdown
        const instructions = `
**Is this an unstructured date reference that should be structured for your timeline?**

*Add #year/ tag to mark as a year-only date, or consider restructuring as a full date format (YYYY-MM-DD, "Month Day, Year", etc.)*
`;
        const instructionsDiv = contentEl.createDiv('potential-years-instructions');
        const component = new Component();
        component.load();
        await MarkdownRenderer.render(this.app, instructions, instructionsDiv, '', component);

        // Action buttons
        const actions = contentEl.createDiv('potential-years-actions');

        const yesBtn = actions.createEl('button', { text: 'Add #year/ tag' });
        yesBtn.classList.add('mod-cta');
        yesBtn.addEventListener('click', () => {
            void this.addYearTag(match).then(() => {
                this.matches.splice(this.currentIndex, 1);
                if (this.currentIndex >= this.matches.length) {
                    this.currentIndex = Math.max(0, this.matches.length - 1);
                }
                void this.renderMatch();
            });
        });

        const noBtn = actions.createEl('button', { text: 'Skip' });
        noBtn.addEventListener('click', () => {
            this.matches.splice(this.currentIndex, 1);
            if (this.currentIndex >= this.matches.length) {
                this.currentIndex = Math.max(0, this.matches.length - 1);
            }
            void this.renderMatch();
        });

        // Navigation buttons
        const navDiv = contentEl.createDiv('potential-years-navigation');

        const prevBtn = navDiv.createEl('button', { text: 'Previous' });
        prevBtn.disabled = this.currentIndex === 0;
        prevBtn.addEventListener('click', () => {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                void this.renderMatch();
            }
        });

        const nextBtn = navDiv.createEl('button', { text: 'Next' });
        nextBtn.disabled = this.currentIndex >= this.matches.length - 1;
        nextBtn.addEventListener('click', () => {
            if (this.currentIndex < this.matches.length - 1) {
                this.currentIndex++;
                void this.renderMatch();
            }
        });

        const closeBtn = navDiv.createEl('button', { text: 'Close' });
        closeBtn.addEventListener('click', () => this.close());
    }

    async addYearTag(match: YearMatch) {
        const content = await this.app.vault.read(match.file);
        const lines = content.split('\n');
        
        if (match.lineNumber > 0 && match.lineNumber <= lines.length) {
            const line = lines[match.lineNumber - 1];
            
            // Find the year in the line and add #year/ tag after it
            const yearMatch = new RegExp(`\\b${match.year}\\b`).exec(line);
            if (yearMatch) {
                const before = line.substring(0, yearMatch.index + match.year.length);
                const after = line.substring(yearMatch.index + match.year.length);
                
                // Add the tag right after the year
                lines[match.lineNumber - 1] = `${before} #year/${match.year}${after}`;
                
                await this.app.vault.modify(match.file, lines.join('\n'));
                
                // Refresh the timeline view if it's open
                this.plugin.refreshOpenViews();
            }
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
