import { ChatOpenAI } from "@langchain/openai";
import * as O from "fp-ts/lib/Option";
import { Client as LangSmithClient } from "langsmith";

export enum ModelType {
    GPT4o = "gpt-4o",
    GPT4oMini = "gpt-4o-mini",
}

export interface ILangChainProvider {
    getGpt4o(): ChatOpenAI;
    getGpt4oMini(): ChatOpenAI;
    getLangsmithClient(): O.Option<LangSmithClient>;
}