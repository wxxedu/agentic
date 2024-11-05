import { ChatOpenAI } from "@langchain/openai";
import * as O from "fp-ts/lib/Option";
import { Client as LangSmithClient } from "langsmith";

export interface LangChainProvider {
    getGpt4o(): ChatOpenAI;
    getGpt4oMini(): ChatOpenAI;
    getLangsmithClient(): O.Option<LangSmithClient>;
}