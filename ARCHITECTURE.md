# RRA (Reasoning Research Agent) Architecture

## Project Overview

A multi-agent reasoning system for intelligent research assistance, built with Next.js and Vercel AI SDK.

## Folder Structure

```
reasoning-research-agent/
├── app/                          # Next.js App Router
│   ├── favicon.ico
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page
│
├── lib/                          # Core business logic
│   └── prompts/                  # Prompt templates
│       ├── personas/             # Persona-specific prompts
│       │   ├── summarizer.ts     # Summarizer persona
│       │   ├── synthesizer.ts    # Synthesizer persona (follow-up questions)
│       │   └── reviewer.ts       # Reviewer persona (confidence scoring)
│       └── index.ts              # Prompts module entry point
│
├── public/                       # Static assets
│
├── .gitignore
├── ARCHITECTURE.md               # This file
├── README.md
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## Core Components

### 1. Prompts (`lib/prompts/`)

The prompts system manages persona-based prompt templates for different reasoning agents.

**Agent Types:**
- `summarizer`: Conversation summarization with confidence scoring
- `synthesizer`: Generates follow-up questions from conversation history
- `reviewer`: Critical review with confidence scoring

**Exports:**
- `getSummarizerPrompt(conversation: string, reviewer: string): string`
- `getSynthesizerPrompt(conversation: string): string`
- `getReviewerPrompt(conversation: string, reviewer: string): string`
- `AgentType`: Type definition for agent personas

### 2. Persona Prompts

#### Summarizer
- Reviews conversation history
- Provides confidence-scored answers
- Returns JSON with `confidence_score` (1-5) and `answer`

#### Synthesizer
- Summarizes previous discussions in 2-3 sentences
- Identifies underexplored topics
- Generates thought-provoking follow-up questions
- Returns JSON with `question`

#### Reviewer
- Critical analysis of conversations
- Confidence-based evaluation
- Returns JSON with `confidence_score` (1-5) and `answer`

## Tech Stack

- **Framework**: Next.js 16.0.1 (App Router)
- **Runtime**: React 19.2.0
- **AI SDK**: Vercel AI SDK 5.0.89
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Linting**: ESLint 9

## Design Principles

1. **Persona-based prompting**: Each agent has a distinct role and output format
2. **Conversation-driven**: All prompts accept conversation history as input
3. **Structured outputs**: JSON responses for type-safe parsing
4. **Confidence scoring**: Agents provide self-assessment of their responses

## Next Steps

### Planned Features
1. **Agents Layer** (`lib/agents/`)
   - BaseAgent class
   - Persona-specific agent implementations

2. **Flows Layer** (`lib/flows/`)
   - Flow orchestrator
   - Sequential, parallel, and conditional pipelines

3. **Services Layer** (`lib/services/`)
   - LLM service integration (OpenAI, Anthropic)
   - Research paper parsing

4. **API Routes** (`app/api/`)
   - Reasoning endpoints
   - Streaming responses

5. **UI Components** (`app/components/`)
   - Chat interface
   - Agent visualization

6. **Type Definitions** (`lib/types/`)
   - Agent types
   - Flow types
   - Common interfaces

### Development Roadmap
- [ ] Implement agent execution layer
- [ ] Create flow orchestration system
- [ ] Build API endpoints with streaming
- [ ] Develop UI components
- [ ] Add error handling and logging
- [ ] Write tests
- [ ] Add monitoring and observability
