import { ChatOpenAI } from '@langchain/openai';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { DEFAULT_SETTINGS, MySettings, MySettingsTab } from 'src/settings';
import { Client as LangSmithClient } from 'langsmith';
import { LangChainProvider } from 'src/llm/langchain';
import * as O from 'fp-ts/lib/Option';
import { openClipboardFormatterModal, openMarkdownFormatterModal } from 'src/agents/formatter';


export default class MyPlugin extends Plugin implements LangChainProvider {
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
				const content = editor.getValue();
				const formattedContent = await openMarkdownFormatterModal(
					this.app,
					content,
					1, // Start with heading level 1
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
					1, // Start with heading level 1
					this
				);
				editor.replaceRange(formattedContent, cursor, cursor);
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