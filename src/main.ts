import { Plugin, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, VIEW_TYPE_MILESTONE_TIMELINE } from './constants';
import type { MilestoneTimelineSettings, YearMatch } from './types';
import MilestoneTimelineView from './views/MilestoneTimelineView';
import MilestoneTimelineSettingTab from './settings';
import MilestoneTimelineHelpModal from './modals/HelpModal';
import PotentialYearsModal from './modals/PotentialYearsModal';
import ExampleCreatedModal from './modals/ExampleCreatedModal';

export default class MilestoneTimelinePlugin extends Plugin {
    settings: MilestoneTimelineSettings;

    async onload() {
        await this.loadSettings();

        // Register the timeline view
        this.registerView(
            VIEW_TYPE_MILESTONE_TIMELINE,
            (leaf) => new MilestoneTimelineView(leaf, this)
        );

        // Add ribbon icon to open timeline
        this.addRibbonIcon('calendar-clock', 'Open Milestone Timeline', () => {
            void this.activateView();
        });

        // Add command to open timeline
        this.addCommand({
            id: 'open-timeline',
            name: 'Open timeline',
            callback: () => {
                void this.activateView();
            }
        });

        // Add help command
        this.addCommand({
            id: 'show-help',
            name: 'Show help',
            callback: () => {
                new MilestoneTimelineHelpModal(this.app).open();
            }
        });

        // Add command to create example correspondence
        this.addCommand({
            id: 'create-example-correspondence',
            name: 'Create example correspondence',
            callback: async () => {
                await this.createExampleCorrespondence();
            }
        });

        // Add command to create single penpal correspondence
        this.addCommand({
            id: 'create-penpal-letters',
            name: 'Create example: penpal letters (french)',
            callback: async () => {
                await this.createPenpalLetters();
            }
        });

        // Add command to find potential year references
        this.addCommand({
            id: 'find-potential-years',
            name: 'Find potential year references',
            callback: async () => {
                await this.findPotentialYears();
            }
        });

        // Add settings tab
        this.addSettingTab(new MilestoneTimelineSettingTab(this.app, this));
    }

    async activateView() {
        const { workspace } = this.app;
        
        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_MILESTONE_TIMELINE);

        if (leaves.length > 0) {
            // View already exists, reveal it
            leaf = leaves[0];
        } else {
            // Create new leaf in right sidebar
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                    type: VIEW_TYPE_MILESTONE_TIMELINE,
                    active: true,
                });
            }
        }

        if (leaf) {
            void workspace.revealLeaf(leaf);
        }
    }

    async loadSettings() {
        const data = await this.loadData() as Partial<MilestoneTimelineSettings> | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data || {});
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Refresh any open timeline views
        this.refreshOpenViews();
    }

    refreshOpenViews() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MILESTONE_TIMELINE);
        for (const leaf of leaves) {
            const view = leaf.view;
            if (view instanceof MilestoneTimelineView) {
                void view.refresh();
            }
        }
    }

    async createExampleCorrespondence() {
        const folderPath = 'Milestone Timeline Examples';
        const { vault } = this.app;

        // Check if folder already exists
        const existingFolder = vault.getAbstractFileByPath(folderPath);
        if (existingFolder) {
            new Notice('Example correspondence folder already exists. Creating additional example letters...');
        } else {
            // Create folder
            await vault.createFolder(folderPath);
        }

        // Create example letters
        const letters = [
            {
                filename: '1947-03 - Lettre de Marie (Paris).md',
                content: `---
date: Mars 1947
dateUncertain: true
---

# Lettre de Marie Dubois

**De:** Paris, France  
**Date:** Mars 1947

---

Chère amie,

Le printemps arrive à Paris et les marronniers commencent à fleurir le long de la Seine. La ville se réveille lentement après ces années difficiles.

Je pense visiter en Août 1947 si je peux organiser le voyage.

Les cafés rouvrent un par un, et on entend à nouveau de la musique dans les rues.

Amicalement,  
Marie

---

*[Original letter in French - dates automatically detected regardless of your timeline language setting]*

#correspondence #france`
            },
            {
                filename: '1952-05 - Brief von Hans (Berlin).md',
                content: `---
date: Mai 1952
dateUncertain: true
---

# Brief von Hans Schmidt

**Von:** Berlin, Deutschland  
**Datum:** Mai 1952

---

Liebe Freundin,

Ich schreibe Ihnen aus dem wiederaufgebauten Berlin. Die Universität hat mir eine neue Position angeboten, und ich bin sehr aufgeregt über diese Möglichkeit.

Eine wichtige Konferenz ist für Juli 1952 geplant. Ich hoffe, Sie können teilnehmen.

Die Stadt verändert sich jeden Tag. Wo letztes Jahr noch Trümmer standen, erheben sich jetzt neue Gebäude.

Mit freundlichen Grüßen,  
Hans

---

*[Original letter in German - Mai (May) detected and shown in your timeline]*

#correspondence #germany`
            },
            {
                filename: '1958-08 - 田中さんからの手紙 (Tokyo).md',
                content: `---
date: 8月 1958
dateUncertain: true
---

# 田中ゆきからの手紙

**から:** 東京、日本  
**日付:** 1958年8月

---

親愛なる友人へ、

お盆の季節になりました。東京は1964年のオリンピックの準備で大きく変わっています。

祖母はこの都市を認識しないでしょう。すべてが新しく、すべてが変化しています。

8月15日にお盆の祭りがありました。とても美しかったです。

敬具、  
ゆき

---

*[Original letter in Japanese - 8月 (August) automatically parsed]*

#correspondence #japan`
            },
            {
                filename: '1963-03 - Carta de Carlos (Madrid).md',
                content: `---
date: Marzo 1963
dateUncertain: true
---

# Carta de Carlos Ruiz

**De:** Madrid, España  
**Fecha:** Marzo 1963

---

Querida amiga,

Te escribo desde Madrid donde trabajo como periodista. Los tiempos son difíciles pero importantes.

Publiqué un artículo importante el 7 de Marzo de 1963 sobre la libertad de prensa.

Las palabras tienen poder, pero también peligro. Cada día escribo con cuidado pero con verdad.

Un abrazo fuerte,  
Carlos

---

*[Original letter in Spanish - Marzo (March) recognized in any timeline language]*

#correspondence #spain`
            },
            {
                filename: '1968-05 - Lettre de Marie (Mai 68).md',
                content: `---
date: Mai 1968
---

# Lettre Urgente de Marie

**De:** Paris, France  
**Date:** 28 Mai 1968

---

Mon amie,

J'écris rapidement. Les rues de Paris sont remplies d'étudiants et de manifestants. C'est Mai 68 - l'histoire se fait dans nos rues!

Les événements du 28 Mai 1968 seront dans tous les livres d'histoire.

Les voix demandent le changement. L'université est fermée. La ville vibre d'énergie révolutionnaire.

Je joins des affiches que j'ai trouvées.

Solidairement,  
Marie

---

*[Mai 68 - French date formatting preserved in original context]*

#correspondence #france #mai-68`
            },
            {
                filename: '1975 - Letzter Brief von Hans.md',
                content: `---
date: 1975
dateUncertain: true
---

# Letzter Brief von Hans Schmidt

**Von:** Berlin, Deutschland  
**Datum:** 1975 (genaues Datum unbekannt)

---

Meine alte Freundin,

Dies wird wahrscheinlich mein letzter Brief sein. Ich bin müde, aber dankbar.

Dreißig Jahre Briefe - ein Leben voller Freundschaft, bewahrt in Papier und Tinte.

Danke für jedes Wort, jede Erinnerung, jede geteilte Geschichte.

Berlin und Paris, Tokyo und Madrid - wir haben die Welt durch unsere Briefe verbunden.

In Freundschaft für immer,  
Hans

---

*[Only year known - demonstrates year-only date handling]*

#correspondence #germany #memorial`
            },
            {
                filename: '_README - Multilingual Timeline Demo.md',
                content: `---
date: 2024-01-15
---

# 🌍 Multilingual Timeline Demonstration

This collection showcases the **Milestone Timeline plugin's internationalization capabilities**.

## What This Demonstrates

### 📝 Original Letters in Native Languages

Each letter is written in its **original language** with **native date formats**:

- 🇫🇷 **French:** "Mars 1947", "Mai 1968"
- 🇩🇪 **German:** "Mai 1952", "Juli 1952"
- 🇯🇵 **Japanese:** "8月 1958" (8-gatsu = August)
- 🇪🇸 **Spanish:** "Marzo 1963"

### 🔄 Automatic Date Parsing

The plugin **automatically detects and parses** dates regardless of language:

1. ✅ French "Mars 1947" → Parsed as March 1947
2. ✅ Spanish "Marzo 1963" → Parsed as March 1963
3. ✅ German "Mai 1952" → Parsed as May 1952
4. ✅ Japanese "8月" → Parsed as August

### 🎯 Your Timeline, Your Language

**Open the Milestone Timeline** and see all dates displayed correctly!

**Then try this:**
1. Go to Settings → Milestone Timeline → **Language**
2. Change to Spanish → Timeline shows "Mayo", "Marzo"
3. Change to French → Timeline shows "Mai", "Mars"
4. Change to Japanese → Timeline shows "5月", "3月"

**The same letters work in ALL languages!**

## 🎓 How It Works

The plugin:
1. **Parses** dates written in any supported language
2. **Normalizes** them to standard dates
3. **Displays** timeline markers in YOUR selected language
4. **Preserves** original content unchanged

## 📊 Timeline Features Shown

- **Year markers:** 1947 → 1975 (spanning decades)
- **Month markers:** Multiple letters in same year
- **Uncertainty indicators (~):** Approximate dates
- **Language mixing:** French, German, Spanish, Japanese together
- **Date formats:** Year-only, Month-Year, complete dates

## 💡 Real-World Use Case

Perfect for:
- Historical document collections
- International correspondence archives
- Research across multiple languages
- Preserving original language context
- Multilingual family history projects

## 🧪 Try These Experiments

1. **Switch languages** and watch timeline update
2. **Click milestones** to jump to original letters
3. **Notice** how "Mai" (French/German) is the same month
4. **See** uncertainty markers (~) on approximate dates
5. **Observe** authentic foreign language content preserved

---

**Note:** This demonstrates the plugin's ability to work with real multilingual content. The same notes work correctly regardless of your timeline language setting.

Delete the "Milestone Timeline Examples" folder when you're done exploring!

#example #internationalization #multilingual #timeline-demo`
            }
        ];

        // Create each letter
        let createdCount = 0;
        for (const letter of letters) {
            const filePath = `${folderPath}/${letter.filename}`;
            try {
                await vault.create(filePath, letter.content);
                createdCount++;
            } catch {
                // File may already exist, skip silently
            }
        }

        // Show success message and open the index
        if (createdCount > 0) {
            // Open the index file
            const indexPath = `${folderPath}/_README - Multilingual Timeline Demo.md`;
            const indexFile = vault.getAbstractFileByPath(indexPath);
            if (indexFile instanceof TFile) {
                const leaf = this.app.workspace.getLeaf(false);
                void leaf.openFile(indexFile);
            }

            // Open the timeline
            await this.activateView();

            // Show success message
            const message = `Created ${createdCount} authentic multilingual letters in "${folderPath}" folder.\n\nThese are REAL foreign language letters with native dates (French "Mars", Spanish "Marzo", Japanese "8月").\n\nThe timeline is now open. Try changing Settings → Language to see the same letters displayed in different locales!`;
            
            // Use a modal for better visibility
            new ExampleCreatedModal(this.app, message).open();
        }
    }

    async createPenpalLetters() {
        const folderPath = 'Grandparent Letters/Correspondence with Amélie';
        const { vault } = this.app;

        // Check if folder already exists
        const existingFolder = vault.getAbstractFileByPath(folderPath);
        if (existingFolder) {
            new Notice('Amélie\'s correspondence folder already exists. Overwriting existing letters...');
        } else {
            // Create folder structure
            await vault.createFolder('Grandparent Letters').catch(() => {});
            await vault.createFolder(folderPath).catch(() => {});
        }

        // Create Amélie's letters spanning several decades
        const letters = [
            {
                filename: '1956-04-12 - First Letter from Paris.md',
                content: `---
date: 12 Avril 1956
location: Paris, France
from: Amélie Rousseau
---

# Ma première lettre

**Paris, le 12 Avril 1956**

Chère amie,

C'est avec une grande joie que je t'écris cette première lettre depuis Paris! Nous nous sommes rencontrées il y a seulement trois semaines lors de ce merveilleux séjour à [[Nice]], mais j'ai l'impression de te connaître depuis toujours.

La vie à Paris est exactement comme je l'avais imaginée - effervescente, bruyante, magnifique. Chaque matin, je traverse le [[Pont des Arts]] pour me rendre à mon travail à la librairie. L'odeur des livres anciens et du café frais me rappelle nos conversations nocturnes sur la terrasse de l'hôtel.

Je pense souvent à notre promesse de rester en contact. Le monde semble si vaste parfois, mais ces lettres nous rapprocheront, j'en suis certaine.

Avec toute mon affection,  
**Amélie**

---

*My dearest friend, this is the beginning of what would become a lifelong correspondence across continents and decades.*

#correspondence #paris #1950s`,
            },
            {
                filename: '1963-08-15 - Summer in Provence.md',
                content: `---
date: 15 Août 1963
location: Avignon, Provence
from: Amélie Rousseau
---

# Été en Provence

**Avignon, le 15 Août 1963**

Ma très chère amie,

Sept années ont passé depuis ma première lettre! Le temps file si vite. Je t'écris aujourd'hui depuis la maison de campagne de ma tante en Provence. Les champs de lavande s'étendent à perte de vue, et le soleil d'août rend tout doré et parfait.

Tu te souviens que je t'avais parlé de [[Jean-Pierre Dubois|Jean-Pierre]]? Eh bien, nous nous sommes mariés au printemps! Le 3 Mai 1963, pour être précise. C'était une petite cérémonie intime dans une chapelle près de [[Montmartre]]. J'aurais tant aimé que tu sois là.

Jean-Pierre est professeur de littérature. Il me lit de la poésie tous les soirs avant de dormir. Hier soir, c'était [[Baudelaire]] - "L'Invitation au voyage". Tu aurais adoré.

Comment va ta vie de l'autre côté de l'océan? Tes lettres me manquent. La dernière date de mars dernier.

Je t'embrasse tendrement,  
**Amélie**

P.S. - J'ai joint quelques graines de lavande. Plante-les en pensant à moi!

#correspondence #provence #marriage #1960s`,
            },
            {
                filename: '1978-11-03 - Autumn Reflections.md',
                content: `---
date: 3 Novembre 1978
location: Paris, France
from: Amélie Rousseau-Dubois
---

# Réflexions d'automne

**Paris, le 3 Novembre 1978**

Mon amie de toujours,

Les feuilles tombent sur les boulevards parisiens, et je me retrouve à penser à toutes ces années passées. Vingt-deux ans d'amitié à travers ces lettres! N'est-ce pas extraordinaire?

Les enfants grandissent si vite. [[Sophie Dubois|Sophie]] a maintenant quinze ans - elle te ressemble, tu sais. La même détermination dans les yeux. [[Thomas Dubois|Thomas]] vient d'avoir douze ans la semaine dernière, le 27 Octobre 1978. Il veut devenir écrivain, comme son père.

Jean-Pierre et moi avons emmené les enfants à [[Londres]] cet été. Sophie a adoré le [[British Museum]], tandis que Thomas n'a voulu visiter que les librairies de [[Charing Cross Road]]. Nous avons pensé à toi constamment - tu nous avais tant parlé de ta visite là-bas dans ta lettre de 1971.

Le monde change rapidement autour de nous. Parfois je me sens dépassée par tout ce progrès. Mais ta constante amitié reste un phare dans ma vie.

Avec toute ma tendresse,  
**Amélie**

P.S. - Sophie a dessiné un portrait de notre famille. Je te l'envoie séparément.

#correspondence #family #paris #1970s`,
            },
            {
                filename: '1995-12-20 - Memories and Hope.md',
                content: `---
date: 20 Décembre 1995
location: Paris, France
from: Amélie Rousseau-Dubois
---

# Souvenirs et espoir

**Paris, le 20 Décembre 1995**

Ma plus chère et plus vieille amie,

Près de quarante ans d'amitié! Qui aurait cru, lors de cette rencontre fortuite à [[Nice]] en 1956, que nous échangerions encore des lettres à la fin du siècle?

Jean-Pierre a pris sa retraite le mois dernier, le 15 Novembre 1995. Nous parlons de voyager davantage. L'Amérique, peut-être? Après toutes ces années de correspondance, il est temps que nous nous revoyions en personne, tu ne crois pas?

Sophie est maintenant médecin à [[Lyon]]. Elle s'est mariée l'année dernière à un homme merveilleux nommé [[Dr. Michel Fontaine|Michel]]. Thomas vit à [[Montréal]] - il a publié son premier roman cette année! "Les Lettres de l'Atlantique" - inspiré, dit-il, par toutes les histoires que je lui racontais de notre correspondance.

Le monde est devenu si petit avec tous ces ordinateurs et téléphones portables. Les jeunes n'écrivent plus de lettres comme nous le faisions. Ils ne savent pas ce qu'ils manquent - l'anticipation, le plaisir de tenir une enveloppe, de reconnaître l'écriture d'un ami...

Je garde précieusement chacune de tes lettres dans une boîte en bois que Jean-Pierre m'a offerte. Elles sont mon trésor le plus précieux.

Joyeux Noël, mon amie. J'espère que le nouveau millénaire nous apportera cette rencontre tant attendue.

Avec tout mon amour,  
**Amélie**

P.S. - Ci-joint une photo récente de toute la famille lors de Thanksgiving. Oui, nous célébrons Thanksgiving maintenant - ton influence après toutes ces années! 😊

#correspondence #millennium #family #reflection #1990s`,
            }
        ];

        // Create each letter
        let createdCount = 0;
        for (const letter of letters) {
            const filePath = `${folderPath}/${letter.filename}`;
            try {
                await vault.create(filePath, letter.content);
                createdCount++;
            } catch {
                // If file exists, try to modify it
                try {
                    await vault.adapter.write(filePath, letter.content);
                    createdCount++;
                } catch {
                    // Failed to create/update file, skip silently
                }
            }
        }

        if (createdCount > 0) {
            // Open the first letter
            const firstLetterPath = `${folderPath}/${letters[0].filename}`;
            const firstLetter = vault.getAbstractFileByPath(firstLetterPath);
            if (firstLetter instanceof TFile) {
                const leaf = this.app.workspace.getLeaf(false);
                void leaf.openFile(firstLetter);
            }

            // Open the timeline
            await this.activateView();

            // Show success message
            const message = `Created ${createdCount} letters from Amélie spanning 1956-1995!\n\n📮 This is a personal correspondence collection showing:\n• Authentic French dates (12 Avril 1956, 15 Août 1963)\n• Life events across 4 decades\n• References to people and places (using wiki-links)\n• The evolution of a friendship through letters\n\nThe timeline is now open. Notice how all French dates are automatically parsed and displayed in your preferred language!`;
            
            new ExampleCreatedModal(this.app, message).open();
        }
    }

    async findPotentialYears() {
        const { vault } = this.app;
        const files = vault.getMarkdownFiles();
        
        // Pattern to find potential 4-digit years (1000-2100)
        const yearPattern = /(?<![\d-/])(?<!-)(?<!\/)(?<!\[\[)(?<!#year\/)\b(1[0-9]\d{2}|20\d{2}|2100)\b(?![\d-/])(?!--)(?!\]\])/g;
        
        const matches: YearMatch[] = [];
        
        for (const file of files) {
            const content = await vault.cachedRead(file);
            
            // Skip frontmatter
            let contentWithoutFrontmatter = content;
            if (content.startsWith('---')) {
                const endOfFrontmatter = content.indexOf('\n---', 3);
                if (endOfFrontmatter !== -1) {
                    contentWithoutFrontmatter = content.substring(endOfFrontmatter + 4);
                }
            }
            
            // Skip comments
            const contentWithoutComments = contentWithoutFrontmatter.replace(/%%[\s\S]*?%%/g, '');
            
            const lines = contentWithoutComments.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                yearPattern.lastIndex = 0;
                let match;
                
                while ((match = yearPattern.exec(line)) !== null) {
                    const year = match[1];
                    const matchIndex = match.index;
                    const matchEnd = matchIndex + year.length;
                    
                    // Check if this specific year match is part of a structured date
                    // by looking at surrounding context (20 chars before and after)
                    const contextStart = Math.max(0, matchIndex - 20);
                    const contextEnd = Math.min(line.length, matchEnd + 20);
                    const surroundingText = line.substring(contextStart, contextEnd);
                    
                    let isPartOfStructuredDate = false;
                    
                    // Check for ISO dates: YYYY-MM-DD or YYYY-MM
                    if (/\d{4}-\d{1,2}(-\d{1,2})?/.test(surroundingText)) {
                        isPartOfStructuredDate = true;
                    }
                    // Check for numeric dates: M/D/YYYY, D/M/YYYY, M/D/YY
                    else if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(surroundingText)) {
                        isPartOfStructuredDate = true;
                    }
                    // Check for month names in any supported language
                    else if (/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(surroundingText)) {
                        isPartOfStructuredDate = true;
                    }
                    else if (/(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre|Ene|Abr|Ago|Dic)/i.test(surroundingText)) {
                        isPartOfStructuredDate = true;
                    }
                    else if (/(Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre|Fév|Avr|Aoû|Déc)/i.test(surroundingText)) {
                        isPartOfStructuredDate = true;
                    }
                    else if (/[0-9]+月/.test(surroundingText)) {
                        isPartOfStructuredDate = true;
                    }
                    // Check for ordinal suffixes near the year
                    else if (/(st|nd|rd|th|º|ª|°|er|ère|ème|eme|日)/.test(surroundingText)) {
                        isPartOfStructuredDate = true;
                    }
                    // Check for date tags
                    else if (/#(date|year)\//.test(surroundingText)) {
                        isPartOfStructuredDate = true;
                    }
                    // Check for Obsidian incomplete dates
                    else if (/(dd|mm)\/\d{1,2}\/\d{2,4}/i.test(surroundingText) || /\d{1,2}\/(dd|mm)\/\d{2,4}/i.test(surroundingText)) {
                        isPartOfStructuredDate = true;
                    }
                    
                    if (isPartOfStructuredDate) {
                        continue;
                    }
                    
                    // Get context (the line containing the year)
                    let context = line.trim();
                    if (context.length > 80) {
                        // Try to center the year in the context
                        const matchPos = match.index;
                        const start = Math.max(0, matchPos - 40);
                        const end = Math.min(line.length, matchPos + 40);
                        context = (start > 0 ? '...' : '') + line.substring(start, end).trim() + (end < line.length ? '...' : '');
                    }
                    
                    matches.push({
                        year,
                        file,
                        lineNumber: i + 1,
                        context
                    });
                }
            }
        }
        
        if (matches.length === 0) {
            new ExampleCreatedModal(this.app, 'No unstructured date references found in your notes.\n\nThis searches for 4-digit numbers (1000-2100) that might be dates but aren\'t already captured by structured date patterns (ISO dates, month names, date tags, etc.).\n\nThis helps you identify and structure ambiguous date references.').open();
        } else {
            new PotentialYearsModal(this.app, this, matches).open();
        }
    }
}
