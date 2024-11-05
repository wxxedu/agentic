import { ChatOpenAI } from "@langchain/openai";
import { PluginSettingTab, Plugin, App, Setting } from "obsidian";

export interface MySettings {
    openaiApiKey?: string;
    langchainApiKey?: string;
    enableLangSmithTracing?: boolean;
}

export const DEFAULT_SETTINGS: MySettings = {
};

type ISettingsTabPlugin = Plugin & {
    settings: MySettings;
    saveSettings: () => Promise<void>;
}

export class MySettingsTab extends PluginSettingTab {
    plugin: ISettingsTabPlugin;
    constructor(app: App, plugin: ISettingsTabPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('OpenAI API Key')
            .setDesc('Your OpenAI API key')
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.openaiApiKey || '')
                .then(text => { text.inputEl.type = 'password'; })
                .onChange(async (value) => {
                    this.plugin.settings.openaiApiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('LangChain API Key')
            .setDesc('Your LangChain API key')
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.langchainApiKey || '')
                .then(text => { text.inputEl.type = 'password'; })
                .onChange(async (value) => {
                    this.plugin.settings.langchainApiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable LangSmith Tracing')
            .setDesc('Enable tracing of LangChain operations in LangSmith')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableLangSmithTracing || false)
                .onChange(async (value) => {
                    this.plugin.settings.enableLangSmithTracing = value;
                    await this.plugin.saveSettings();
                }));
    }
}

