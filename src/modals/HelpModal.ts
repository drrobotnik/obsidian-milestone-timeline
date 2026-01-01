import { App, Modal, MarkdownRenderer, Component } from 'obsidian';

export default class MilestoneTimelineHelpModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('milestone-help-modal');

        const markdown = `
# Milestone Timeline help

## Quick start
- **Open Timeline:** Click the calendar-clock icon in the sidebar or use Command Palette
- **Click any milestone** to jump to that line in your note
- **Settings:** Configure in Settings → Milestone Timeline 2.0

## Supported date formats

**1. Frontmatter** (recommended for primary dates):
\`\`\`yaml
---
date: 2024-03-15
deadline: March 31, 2001
milestone: Aug 23 1931
dateFormat: International
dateUncertain: true
---
\`\`\`

**Obsidian Properties UI:** To use partial dates like "May 1985" in the Properties panel:
1. Click the property type icon next to the date field
2. Change **Property Type → Text**
3. Type "May 1985" directly

*The Date property type doesn't save incomplete dates to the file.*

**2. Inline dates:**
- \`2024-03-15\` - ISO format (unambiguous)
- \`March 31, 2001\` - Natural language (unambiguous)
- \`Aug 23 1931\` - Short month format (unambiguous)
- \`May 1985\` - Month Year (partial, defaults to 15th, marked uncertain)
- \`05/dd/1985\` - Obsidian incomplete date (day unknown, defaults to 15th, marked uncertain)
- \`1/2/1953\` - Numeric format (ambiguous - see settings)

**Year-only dates (explicit annotation required):**

To avoid ambiguity with page numbers or other 4-digit numbers, year-only dates must be explicitly tagged:

\`Published in #year/1809\` - Year-only date (defaults to July 1, marked uncertain)

**Use "Find Potential Year References"** command to quickly review and tag years in your notes!

**Partial/uncertain dates:**

Use \`dateUncertain: true\` for approximate dates. Partial dates (year-only or year-month) are automatically marked uncertain. Shows **~** indicator on the timeline.

**Numeric date ambiguity:**

\`1/2/1953\` could be Jan 2 (US) or Feb 1 (International). Set your preference in Settings → Date format preference. Override per-note with \`dateFormat\` in frontmatter.

**3. Wiki-link dates:**
\`\`\`
Important meeting: [[2024-03-15]]
\`\`\`

**4. Tag dates:**
\`\`\`
Contract signed #date/1987/02/18
Published in #year/1809
\`\`\`
*Use \`#year/YYYY\` for year-only dates to avoid ambiguity with page numbers.*

## Timeline features
- **Year markers:** Large badges marking each new year
- **Month markers:** Appear for years with many dates (configurable)
- **Heading context:** Shows the nearest section heading
- **Tag indicator:** icon for dates from tags
- **Uncertainty indicator:** **~** icon for approximate/partial dates
- **Click to navigate:** Opens note at exact line

## Key settings
- **Sort order:** Ascending (oldest first) or descending
- **Date format preference:** US (M/D/YYYY) or International (D/M/YYYY)
- **Language:** English, Spanish, French, Japanese for month names
- **Month threshold:** How many dates needed to show months (default: 10)
- **Exclude screenshots:** Filter out dates in image filenames
- **Include tag dates:** Toggle #date/YYYY/MM/DD and #year/YYYY support

## Useful commands
- **Find potential year references:** Scans notes for 4-digit numbers (1000-2100) that might be years. Helps you quickly add #year/ tags to meaningful dates.
- **Show help:** Opens this help dialog
- **Create example correspondence:** Creates sample notes to explore features

## Example note
\`\`\`markdown
---
date: 2024-01-15
dateFormat: International
---
# Project Timeline

## Planning
Started on Jan 15 2024

## Development  
- Kickoff: [[2024-02-01]]
- Beta release: #date/2024/05/20

## Launch
Final launch: 2024-07-01

## International Letter
Letter from London dated 1/2/1953 (Feb 1, 1953)
\`\`\`
*This note uses International date format, so 1/2/1953 = Feb 1!*

## Tips
- Use frontmatter for the main date of a note
- Headings provide context - organize notes with clear sections
- Screenshot dates are auto-filtered by default
- Lower month threshold for more detailed navigation
- Click Refresh button after changing settings

---

**Need more help?** Check the README.md file in the plugin folder for detailed documentation.
`;

        // Create a component for the markdown renderer
        const component = new Component();
        component.load();

        await MarkdownRenderer.render(
            this.app,
            markdown,
            contentEl,
            '',
            component
        );

        // Add close button
        const closeBtn = contentEl.createEl('button', { text: 'Close' });
        closeBtn.setCssProps({ marginTop: '1em' });
        closeBtn.addEventListener('click', () => this.close());
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
