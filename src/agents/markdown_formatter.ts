import { ILangChainProvider, ModelType } from "src/llm/langchain";
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser, StructuredOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { App, Modal } from "obsidian";
import { ISettingsProvider } from "src/settings";

const formatterSystemPrompt = SystemMessagePromptTemplate.fromTemplate(`
You are an expert in Github Flavored Markdown and Obsidian Markdown syntax. 

Please format the following markdown content. If there are anything that you think is a heading, start with heading level {headingLevel}, and increment the subheadings accordingly.

Your job is to understand the content's structure and format it in the Obsidian Markdown format. 
If you find inline math formulas, or anything that's suitable for inline math, or any inline latex expressions, you should enclose them in single dollar signs on both sides. Leave no whitespace between the dollar signs and the formula. 
For example, $x^2$ is a valid inline math formula, but $ x^2 $ or \\( x^2 \\) are not. Similarly, $x^2 + y^2 = z^2$ is a valid inline math formula, but $ x^2 + y^2 = z^2 $ or \\( x^2 + y^2 = z^2 \\) are not.

If you find block math formulas, or anything that's suitable for block math, you should enclose them in double dollar signs on both sides. Add line breaks after the double dollar signs and the formula. 
For example:
$$
x^2
$$
is a valid block math formula, but $$ x^2 $$ is not.

If you find words within math formulas, you should enclose them in either \\text{{...}}, \\texttt{{...}}, or \\operatorname{{...}}. Specifically, 
1. if you find a word that looks like a variable name, you should enclose it in \\text{{...}}. 
2. if you find a word that looks like a function name, you should enclose it in \\operatorname{{...}}. 
3. if the passage is related to computer science, and the word looks like a variable name, you should enclose it in \\texttt{{...}}.

Please return only the raw formatted markdown content, and nothing else. DO NOT WRAP the content in \`\`\`markdown or \`\`\`md, just return the raw content.
`);

const formatterHumanPrompt = HumanMessagePromptTemplate.fromTemplate(`
You are an expert in Github Flavored Markdown and Obsidian Markdown syntax. 

Please format the following markdown content. If there are anything that you think is a heading, start with heading level {headingLevel}, and increment the subheadings accordingly.

Your job is to understand the content's structure and format it in the Obsidian Markdown format. 
If you find inline math formulas, or anything that's suitable for inline math, or any inline latex expressions, you should enclose them in single dollar signs on both sides. Leave no whitespace between the dollar signs and the formula. 
For example, $x^2$ is a valid inline math formula, but $ x^2 $ or \\( x^2 \\) are not. Similarly, $x^2 + y^2 = z^2$ is a valid inline math formula, but $ x^2 + y^2 = z^2 $ or \\( x^2 + y^2 = z^2 \\) are not.

If you find block math formulas, or anything that's suitable for block math, you should enclose them in double dollar signs on both sides. Add line breaks after the double dollar signs and the formula. 
For example:
$$
x^2
$$
is a valid block math formula, but $$ x^2 $$ is not.

If you find words within math formulas, you should enclose them in either \\text{{...}}, \\texttt{{...}}, or \\operatorname{{...}}. Specifically, 
1. if you find a word that looks like a variable name, you should enclose it in \\text{{...}}. 
2. if you find a word that looks like a function name, you should enclose it in \\operatorname{{...}}. 
3. if the passage is related to computer science, and the word looks like a variable name, you should enclose it in \\texttt{{...}}.

Please return only the raw formatted markdown content, and nothing else. DO NOT WRAP the content in \`\`\`markdown or \`\`\`md, just return the raw content.


{content}
`);


const createMarkdownFormatter = (langChainProvider: ILangChainProvider, settingsProvider: ISettingsProvider) => {
    const prompt = ChatPromptTemplate.fromMessages([
        formatterSystemPrompt,
        formatterHumanPrompt,
    ]);
    const model = settingsProvider.getStringConfig("modelType") === ModelType.GPT4oMini ? langChainProvider.getGpt4oMini() : langChainProvider.getGpt4o();
    const chain = RunnableSequence.from([
        prompt,
        model,
        new StringOutputParser(),
    ]);
    return chain;
}

const formatMarkdown = (langChainProvider: ILangChainProvider, settingsProvider: ISettingsProvider, content: string, headingLevel: number) => {
    const chain = createMarkdownFormatter(langChainProvider, settingsProvider);
    return chain.stream({
        content,
        headingLevel,
    });
}
abstract class BaseFormatterModal extends Modal {
    protected langChainProvider: ILangChainProvider;
    protected onSubmit: (result: string) => void;
    protected headingLevel: number;
    protected settingsProvider: ISettingsProvider;
    protected textArea: HTMLTextAreaElement;
    protected loadingEl: HTMLElement;

    constructor(
        app: App,
        headingLevel: number | undefined,
        langChainProvider: ILangChainProvider,
        settingsTabPlugin: ISettingsProvider,
        onSubmit: (result: string) => void
    ) {
        super(app);
        this.settingsProvider = settingsTabPlugin;
        this.headingLevel = headingLevel ?? this.getDefaultHeadingLevel();
        this.langChainProvider = langChainProvider;
        this.onSubmit = onSubmit;
    }

    private getDefaultHeadingLevel(): number {
        const defaultLevel = 1; // Default heading level if not specified
        const savedLevel = this.settingsProvider.getNumberConfig("headingLevel");
        return savedLevel !== undefined ? savedLevel : defaultLevel;
    }

    protected async setupContent(content: string) {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: this.getTitle() });

        const headingLevelContainer = contentEl.createDiv();
        headingLevelContainer.style.marginBottom = "1em";

        const headingLevelLabel = headingLevelContainer.createEl("label", {
            text: "Heading Level: "
        });

        const headingLevelInput = headingLevelContainer.createEl("input", {
            type: "number",
            value: this.headingLevel.toString(),
            attr: {
                min: "1",
                max: "6"
            }
        });
        headingLevelInput.style.width = "50px";
        headingLevelInput.style.marginLeft = "0.5em";

        const modelTypeContainer = contentEl.createDiv();
        modelTypeContainer.style.marginBottom = "1em";

        const modelTypeLabel = modelTypeContainer.createEl("label", {
            text: "Model Type: "
        });

        const modelTypeSelect = modelTypeContainer.createEl("select", {
            attr: {
                name: "modelType"
            }
        });

        const modelOptions = [ModelType.GPT4oMini, ModelType.GPT4o];
        modelOptions.forEach(option => {
            const opt = modelTypeSelect.createEl("option", { text: option });
            if (option === this.settingsProvider.getStringConfig("modelType")) {
                opt.selected = true;
            }
        });

        modelTypeSelect.addEventListener("change", () => {
            this.settingsProvider.setStringConfig("modelType", modelTypeSelect.value);
        });

        this.loadingEl = contentEl.createEl("div", {
            text: "Formatting markdown...",
        });
        this.loadingEl.style.display = "none";
        this.loadingEl.style.marginBottom = "1em";

        this.textArea = contentEl.createEl("textarea", {
            text: content,
        });
        this.textArea.style.width = "100%";
        this.textArea.style.height = "300px";
        this.textArea.style.marginBottom = "1em";

        const rerunFormatting = async (sourceContent: string) => {
            this.loadingEl.style.display = "block";
            this.textArea.value = "";
            let newFullContent = "";
            const newStream = await formatMarkdown(
                this.langChainProvider,
                this.settingsProvider,
                sourceContent,
                parseInt(headingLevelInput.value)
            );
            for await (const chunk of newStream) {
                newFullContent += chunk;
                this.textArea.value = newFullContent;
            }
            this.loadingEl.style.display = "none";
        };

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = "flex";
        buttonContainer.style.justifyContent = "flex-end";
        buttonContainer.style.gap = "1em";

        const cancelButton = buttonContainer.createEl("button", {
            text: "Cancel",
        });
        cancelButton.addEventListener("click", () => {
            this.close();
        });

        const generateButton = buttonContainer.createEl("button", {
            text: "Generate",
        });
        generateButton.addEventListener("click", async () => {
            await rerunFormatting(this.textArea.value);
        });

        const confirmButton = buttonContainer.createEl("button", {
            text: "Confirm",
        });
        confirmButton.addEventListener("click", () => {
            this.onSubmit(this.textArea.value);
            this.close();
        });
    }

    protected abstract getTitle(): string;

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class MarkdownFormatterModal extends BaseFormatterModal {
    private content: string;

    constructor(
        app: App,
        content: string,
        langChainProvider: ILangChainProvider,
        settingsProvider: ISettingsProvider,
        onSubmit: (result: string) => void
    ) {
        super(app, undefined, langChainProvider, settingsProvider, onSubmit);
        this.content = content;
    }

    async onOpen() {
        await this.setupContent(this.content);
    }

    protected getTitle(): string {
        return "Format Markdown";
    }
}

export class ClipboardFormatterModal extends BaseFormatterModal {
    constructor(
        app: App,
        langChainProvider: ILangChainProvider,
        settingsProvider: ISettingsProvider,
        onSubmit: (result: string) => void
    ) {
        super(app, undefined, langChainProvider, settingsProvider, onSubmit);
    }

    async onOpen() {
        const clipboardContent = await navigator.clipboard.readText();
        await this.setupContent(clipboardContent);
    }

    protected getTitle(): string {
        return "Format Clipboard Content";
    }
}

export class CustomPromptFormatterModal extends BaseFormatterModal {
    private content: string;
    private customPrompt: string;

    constructor(
        app: App,
        content: string,
        langChainProvider: ILangChainProvider,
        settingsProvider: ISettingsProvider,
        onSubmit: (result: string) => void
    ) {
        super(app, undefined, langChainProvider, settingsProvider, onSubmit);
        this.content = content;
    }

    async onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: this.getTitle() });

        const promptContainer = contentEl.createDiv();
        promptContainer.style.marginBottom = "1em";

        const promptLabel = promptContainer.createEl("label", {
            text: "Custom Formatting Instructions:"
        });

        const promptArea = promptContainer.createEl("textarea");
        promptArea.style.width = "100%";
        promptArea.style.height = "200px";
        promptArea.style.marginBottom = "1em";
        this.customPrompt = promptArea.value;

        promptArea.addEventListener("input", (e) => {
            this.customPrompt = (e.target as HTMLTextAreaElement).value;
        });

        await this.setupContent(this.content);
    }

    protected getTitle(): string {
        return "Format Custom Markdown";
    }
}

export const openCustomPromptFormatterModal = (
    app: App,
    content: string,
    langChainProvider: ILangChainProvider,
    settingsProvider: ISettingsProvider
): Promise<string> => {
    return new Promise((resolve) => {
        new CustomPromptFormatterModal(
            app,
            content,
            langChainProvider,
            settingsProvider,
            resolve
        ).open();
    });
};


export const openClipboardFormatterModal = (
    app: App,
    langChainProvider: ILangChainProvider,
    settingsProvider: ISettingsProvider
): Promise<string> => {
    return new Promise((resolve) => {
        new ClipboardFormatterModal(
            app,
            langChainProvider,
            settingsProvider,
            resolve
        ).open();
    });
};


export const openMarkdownFormatterModal = (
    app: App,
    content: string,
    langChainProvider: ILangChainProvider,
    settingsProvider: ISettingsProvider
): Promise<string> => {
    return new Promise((resolve) => {
        new MarkdownFormatterModal(
            app,
            content,
            langChainProvider,
            settingsProvider,
            resolve
        ).open();
    });
};
