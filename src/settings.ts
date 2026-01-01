import { App, PluginSettingTab, Setting } from 'obsidian';
import type MilestoneTimelinePlugin from './main';

export default class MilestoneTimelineSettingTab extends PluginSettingTab {
    plugin: MilestoneTimelinePlugin;

    constructor(app: App, plugin: MilestoneTimelinePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl).setName('Display').setHeading();

        new Setting(containerEl)
            .setName('Sort order')
            .setDesc('Sort milestones in ascending or descending order')
            .addDropdown(dropdown => dropdown
                .addOption('asc', 'Ascending (oldest first)')
                .addOption('desc', 'Descending (newest first)')
                .setValue(this.plugin.settings.sortOrder)
                .onChange(async (value) => {
                    this.plugin.settings.sortOrder = value as 'asc' | 'desc';
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show file links')
            .setDesc('Make milestone titles clickable to open the source note')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFileLinks)
                .onChange(async (value) => {
                    this.plugin.settings.showFileLinks = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Month marker threshold')
            .setDesc('Show month markers within a year if it has at least this many milestones (default: 10)')
            .addText(text => text
                .setPlaceholder('10')
                .setValue(String(this.plugin.settings.monthThreshold))
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        this.plugin.settings.monthThreshold = numValue;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Exclude screenshot dates')
            .setDesc('Ignore dates found in screenshot filenames like "screenshot 2025-11-07.png".')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.excludeScreenshots)
                .onChange(async (value) => {
                    this.plugin.settings.excludeScreenshots = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Include tag dates')
            // eslint-disable-next-line obsidianmd/ui/sentence-case  -- False positive: YYYY/MM/DD is a date format.
            .setDesc('Extract dates from tags in the format #date/YYYY/MM/DD')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeTagDates)
                .onChange(async (value) => {
                    this.plugin.settings.includeTagDates = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Date format preference')
            // eslint-disable-next-line obsidianmd/ui/sentence-case  -- False positive: ISO is an acronym
            .setDesc('How to interpret ambiguous numeric dates like "1/2/1953". ISO dates (2024-03-15) and natural language dates remain unambiguous.')
            .addDropdown(dropdown => dropdown
                // eslint-disable-next-line obsidianmd/ui/sentence-case  -- explaining date formats
                .addOption('US', 'US (M/D/YYYY) - 1/2/1953 = Jan 2, 1953')
                // eslint-disable-next-line obsidianmd/ui/sentence-case  -- explaining date formats
                .addOption('International', 'International (D/M/YYYY) - 1/2/1953 = Feb 1, 1953')
                .setValue(this.plugin.settings.dateFormatPreference)
                .onChange(async (value) => {
                    this.plugin.settings.dateFormatPreference = value as 'US' | 'International';
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Language')
            // eslint-disable-next-line obsidianmd/ui/sentence-case  -- False positive: Describing accurate date formats.
            .setDesc('Language for month names and natural language date parsing. This affects how dates like "May 1985" or "Mayo 1985" are recognized.')
            .addDropdown(dropdown => dropdown
                .addOption('en', 'English')
                // eslint-disable-next-line obsidianmd/ui/sentence-case  -- False positive: Spanish is a language name that should be capitalized.
                .addOption('es', 'Español (Spanish)')
                // eslint-disable-next-line obsidianmd/ui/sentence-case  -- False positive: French is a language name that should be capitalized.
                .addOption('fr', 'Français (French)')
                // eslint-disable-next-line obsidianmd/ui/sentence-case  -- False positive: Japanese is a language name that should be capitalized.
                .addOption('ja', '日本語 (Japanese)')
                .setValue(this.plugin.settings.language)
                .onChange(async (value) => {
                    this.plugin.settings.language = value as 'en' | 'es' | 'fr' | 'ja';
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Include year-only dates')
            .setDesc('Extract standalone year dates (like "1951") from note content. These are marked as uncertain since the exact date is unknown.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeYearOnly)
                .onChange(async (value) => {
                    this.plugin.settings.includeYearOnly = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide sub-setting
                }));

        // Sub-setting for year markers (only show when year-only extraction is enabled)
        if (this.plugin.settings.includeYearOnly) {
            new Setting(containerEl)
                .setName('Show year markers with year-only dates')
                .setDesc('When year-only extraction is enabled, display year markers in the timeline. Disable to reduce visual clutter.')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.showYearMarkersWithYearOnly)
                    .onChange(async (value) => {
                        this.plugin.settings.showYearMarkersWithYearOnly = value;
                        await this.plugin.saveSettings();
                    }));
        }
    }
}
