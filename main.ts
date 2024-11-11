import { ChatOpenAI } from '@langchain/openai';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { DEFAULT_SETTINGS, ISettingsProvider, MySettings, MySettingsTab } from 'src/settings';
import { Client as LangSmithClient } from 'langsmith';
import { ILangChainProvider, ModelType } from 'src/llm/langchain';
import * as O from 'fp-ts/lib/Option';
import { openClipboardFormatterModal, openMarkdownFormatterModal } from 'src/agents/markdown_formatter';
import { openCustomPromptFormatterModal } from 'src/agents/markdown_formatter';
import { parseKlibOutput } from 'src/tools/klib_importer';


export default class MyPlugin extends Plugin implements ILangChainProvider, ISettingsProvider {
	getStringConfig(key: string): string | undefined {
		return this.settings[key as keyof MySettings] as string | undefined;
	}
	setStringConfig(key: string, value: string): void {
		this.settings[key as keyof MySettings] = value;
		this.saveSettings();
	}
	getBooleanConfig(key: string): boolean | undefined {
		return this.settings[key as keyof MySettings] as boolean | undefined;
	}
	setBooleanConfig(key: string, value: boolean): void {
		this.settings[key as keyof MySettings] = value;
		this.saveSettings();
	}
	getNumberConfig(key: string): number | undefined {
		return this.settings[key as keyof MySettings] as number | undefined;
	}
	setNumberConfig(key: string, value: number): void {
		this.settings[key as keyof MySettings] = value;
		this.saveSettings();
	}

	private defaultModelType: ModelType = ModelType.GPT4o;

	getDefaultModelType(): ModelType {
		return this.defaultModelType;
	}
	setDefaultModelType(modelType: ModelType): void {
		this.defaultModelType = modelType;
	}
	getLangsmithClient(): O.Option<LangSmithClient> {
		if (this.settings.langchainApiKey && this.settings.enableLangSmithTracing) {
			return O.some(new LangSmithClient({
				apiKey: this.settings.langchainApiKey,
			}));
		}
		return O.none;
	}

	getGpt4o(): ChatOpenAI {
		return new ChatOpenAI({
			modelName: 'gpt-4o',
			apiKey: this.settings.openaiApiKey,
		});
	}

	getGpt4oMini(): ChatOpenAI {
		return new ChatOpenAI({
			modelName: 'gpt-4o-mini',
			apiKey: this.settings.openaiApiKey,
		});
	}


	settings: MySettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MySettingsTab(this.app, this));

		// Add command to format markdown
		this.addCommand({
			id: 'format-into-markdown',
			name: 'Format into Markdown',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const content = editor.getSelection();
				const formattedContent = await openMarkdownFormatterModal(
					this.app,
					content,
					this,
					this
				);
				editor.setValue(formattedContent);
			}
		});

		// Add command to format clipboard content
		this.addCommand({
			id: 'format-clipboard-into-markdown',
			name: 'Format Clipboard into Markdown',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const cursor = editor.getCursor();
				const formattedContent = await openClipboardFormatterModal(
					this.app,
					this,
					this
				);
				editor.replaceRange(formattedContent, cursor, cursor);
			}
		});

		// Add command to format custom markdown
		this.addCommand({
			id: 'format-custom-markdown',
			name: 'Format Custom Markdown',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const content = editor.getSelection();
				const formattedContent = await openCustomPromptFormatterModal(
					this.app,
					content,
					this,
					this
				);
			}
		});

		// Add command to import klib output
		this.addCommand({
			id: 'import-klib-output',
			name: 'Import Klib Output',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const clipboardContent = await navigator.clipboard.readText();
				const formattedContent = parseKlibOutput(clipboardContent);
				editor.setValue(formattedContent);
			}
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}