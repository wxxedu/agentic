import { LangChainProvider } from "src/llm/langchain";
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser, StructuredOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { App, Modal } from "obsidian";

const formatterSystemPrompt = SystemMessagePromptTemplate.fromTemplate(`
You are an expert in Github Flavored Markdown and Obsidian Markdown syntax. 
Your job is to understand the content's structure and format it in the Obsidian Markdown format. 
If you find inline math formulas, or anything that's suitable for inline math, you should enclose them in single dollar signs on both sides. Leave no whitespace between the dollar signs and the formula.
If you find block math formulas, or anything that's suitable for block math, you should enclose them in double dollar signs on both sides. Add line breaks after the double dollar signs and the formula.

If you find words within math formulas, you should enclose them in either \\text{{...}}, \\texttt{{...}}, or \\operatorname{{...}}. Specifically, 
1. if you find a word that looks like a variable name, you should enclose it in \\text{{...}}. 
2. if you find a word that looks like a function name, you should enclose it in \\operatorname{{...}}. 
3. if the passage is related to computer science, and the word looks like a variable name, you should enclose it in \\texttt{{...}}.
`);

const formatterHumanPrompt = HumanMessagePromptTemplate.fromTemplate(`
Please format the following markdown content. If there are anything that you think is a heading, start with heading level {headingLevel}, and increment the subheadings accordingly.

{content}
`);

const createMarkdownFormatter = (langChainProvider: LangChainProvider) => {
    const prompt = ChatPromptTemplate.fromMessages([
        formatterSystemPrompt,
        formatterHumanPrompt,
    ]);
    const model = langChainProvider.getGpt4o();
    const chain = RunnableSequence.from([
        prompt,
        model,
        new StringOutputParser(),
    ]);
    return chain;
}

const formatMarkdown = (langChainProvider: LangChainProvider, content: string, headingLevel: number) => {
    const chain = createMarkdownFormatter(langChainProvider);
    return chain.stream({
        content,
        headingLevel,
    });
}


export class MarkdownFormatterModal extends Modal {
    private content: string;
    private headingLevel: number;
    private langChainProvider: LangChainProvider;
    private onSubmit: (result: string) => void;
    private loadingEl: HTMLElement;
    private textArea: HTMLTextAreaElement;

    constructor(
        app: App,
        content: string,
        headingLevel: number,
        langChainProvider: LangChainProvider,
        onSubmit: (result: string) => void
    ) {
        super(app);
        this.content = content;
        this.headingLevel = headingLevel;
        this.langChainProvider = langChainProvider;
        this.onSubmit = onSubmit;
    }

    async onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: "Format Markdown" });

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

        this.loadingEl = contentEl.createEl("div", {
            text: "Formatting markdown...",
        });
        this.loadingEl.style.display = "none";
        this.loadingEl.style.marginBottom = "1em";

        this.textArea = contentEl.createEl("textarea", {
            text: "",
        });
        this.textArea.style.width = "100%";
        this.textArea.style.height = "300px";
        this.textArea.style.marginBottom = "1em";

        this.loadingEl.style.display = "block";
        const stream = await formatMarkdown(
            this.langChainProvider,
            this.content,
            parseInt(headingLevelInput.value)
        );

        let fullContent = "";
        for await (const chunk of stream) {
            fullContent += chunk;
            this.textArea.value = fullContent;
        }
        this.loadingEl.style.display = "none";

        headingLevelInput.addEventListener("change", async () => {
            this.loadingEl.style.display = "block";
            this.textArea.value = "";
            let newFullContent = "";
            const newStream = await formatMarkdown(
                this.langChainProvider,
                this.content,
                parseInt(headingLevelInput.value)
            );
            for await (const chunk of newStream) {
                newFullContent += chunk;
                this.textArea.value = newFullContent;
            }
            this.loadingEl.style.display = "none";
        });

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = "flex";
        buttonContainer.style.justifyContent = "flex-end";
        buttonContainer.style.gap = "1em";

        const submitButton = buttonContainer.createEl("button", {
            text: "Submit",
        });
        submitButton.addEventListener("click", () => {
            this.onSubmit(this.textArea.value);
            this.close();
        });

        const cancelButton = buttonContainer.createEl("button", {
            text: "Cancel",
        });
        cancelButton.addEventListener("click", () => {
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class ClipboardFormatterModal extends Modal {
    private langChainProvider: LangChainProvider;
    private onSubmit: (result: string) => void;
    private headingLevel: number;
    private textArea: HTMLTextAreaElement;

    constructor(
        app: App,
        headingLevel: number,
        langChainProvider: LangChainProvider,
        onSubmit: (result: string) => void
    ) {
        super(app);
        this.headingLevel = headingLevel;
        this.langChainProvider = langChainProvider;
        this.onSubmit = onSubmit;
    }

    async onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: "Format Clipboard Content" });

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

        const clipboardContent = await navigator.clipboard.readText();

        this.textArea = contentEl.createEl("textarea", {
            text: clipboardContent,
        });
        this.textArea.style.width = "100%";
        this.textArea.style.height = "300px";
        this.textArea.style.marginBottom = "1em";

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = "flex";
        buttonContainer.style.justifyContent = "flex-end";
        buttonContainer.style.gap = "1em";

        const formatButton = buttonContainer.createEl("button", {
            text: "Format",
        });
        formatButton.addEventListener("click", async () => {
            this.headingLevel = parseInt(headingLevelInput.value);
            const text = this.textArea.value;
            this.textArea.value = "Formatting...";

            const stream = await formatMarkdown(
                this.langChainProvider,
                text,
                this.headingLevel
            );

            let fullContent = "";
            for await (const chunk of stream) {
                fullContent += chunk;
                this.textArea.value = fullContent;
            }
        });

        const submitButton = buttonContainer.createEl("button", {
            text: "Submit",
        });
        submitButton.addEventListener("click", () => {
            this.onSubmit(this.textArea.value);
            this.close();
        });

        const cancelButton = buttonContainer.createEl("button", {
            text: "Cancel",
        });
        cancelButton.addEventListener("click", () => {
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export const openClipboardFormatterModal = (
    app: App,
    headingLevel: number,
    langChainProvider: LangChainProvider
): Promise<string> => {
    return new Promise((resolve) => {
        new ClipboardFormatterModal(
            app,
            headingLevel,
            langChainProvider,
            resolve
        ).open();
    });
};


export const openMarkdownFormatterModal = (
    app: App,
    content: string,
    headingLevel: number,
    langChainProvider: LangChainProvider
): Promise<string> => {
    return new Promise((resolve) => {
        new MarkdownFormatterModal(
            app,
            content,
            headingLevel,
            langChainProvider,
            resolve
        ).open();
    });
};
