import { App, Modal, MarkdownRenderer, Component } from 'obsidian';

export default class ExampleCreatedModal extends Modal {
    message: string;

    constructor(app: App, message: string) {
        super(app);
        this.message = message;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('milestone-example-modal');

        const markdown = `
# Example correspondence created!

${this.message}

> **Try these features:**
> - Read authentic letters in French, German, Spanish, Japanese
> - Change Settings → Language and watch timeline update
> - Same letters work in ALL languages!
> - Click milestones to see original foreign language content
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

        const closeBtn = contentEl.createEl('button', { text: 'Got it!' });
        closeBtn.setCssProps({ marginTop: '1em' });
        closeBtn.addEventListener('click', () => this.close());
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
