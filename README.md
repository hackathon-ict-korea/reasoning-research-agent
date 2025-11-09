# RRA (Reasoning Research Agent)

A multi-agent AI research platform that simulates collaborative biomedical research analysis through specialized AI personas. The system orchestrates parallel reasoning, peer critique, and synthesis across multiple cycles to produce comprehensive research insights.

## Overview

RRA implements a sophisticated multi-phase research workflow where AI agents with distinct expertise analyze conversations, critique each other's reasoning, and synthesize findings into actionable insights. The platform is specifically designed for biomedical research analysis but can be adapted to other domains.

### Key Concepts

**Research Agents (Personas)**

- **Bio-Data Analyst** - Evaluates data quality, statistical robustness, and reproducibility
- **Bio-Method Critic** - Challenges experimental design and methodological assumptions
- **Bio-Visionary Scientist** - Projects future implications and translational applications

**Research Workflow**

1. **Initial Phase**: All researchers analyze the conversation independently
2. **Feedback Phase**: Researchers critique peers' analyses; highest-confidence response advances
3. **Final Phase**: Remaining researchers respond to the feedback winner
4. **Synthesis**: A synthesizer agent mediates perspectives and generates follow-up questions

**Multi-Cycle Analysis**

- Each synthesis can trigger a new cycle with refined questions
- Supports up to 3 cycles of iterative deepening
- Follow-up questions automatically feed into next cycle

## Features

- **Parallel Multi-Agent Reasoning** - Three specialized AI personas analyze simultaneously
- **Peer Review System** - Agents critique and refine their analyses based on peer feedback
- **Confidence Scoring** - Each response includes a 0.0-1.0 confidence score with explicit reasoning
- **Synthesis & Mediation** - Automated reconciliation of conflicting viewpoints
- **Multi-Cycle Research** - Iterative deepening through follow-up questions (up to 3 cycles)
- **File Upload Support** - Analyze documents, images, and other attachments
- **Two UI Modes**:
  - **Playground Mode** - Visual research pipeline with Focus and Timeline views
  - **Chat Mode** - Traditional conversational interface
- **Real-time Streaming** - Progressive updates as each agent completes analysis
- **Question Clarification** - Pre-analysis clarifier helps refine initial questions

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI SDK**: Vercel AI SDK with Google Gemini Flash
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components with Lucide icons
- **State Management**: React hooks
- **Database**: Supabase (integration ready)

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Google AI API key (for Gemini Flash)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd reasoning-research-agent
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
# Create .env.local file
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run generate:supabase-types` - Generate Supabase TypeScript types

## Project Structure

```
reasoning-research-agent/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── chat/                 # Chat endpoint (streaming)
│   │   ├── researchers/          # Multi-agent research endpoint
│   │   ├── summarize/            # Conversation summarization
│   │   └── synthesizer/          # Synthesis & clarification
│   ├── chat/                     # Chat interface page
│   ├── page.tsx                  # Playground interface (main)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   ├── ai-elements/              # Reusable AI UI components
│   │   ├── conversation.tsx      # Chat conversation container
│   │   ├── message.tsx           # Message display components
│   │   ├── prompt-input.tsx      # Input with attachments
│   │   └── shimmer.tsx           # Loading animations
│   ├── ui/                       # Base UI components
│   └── file-upload.tsx           # File attachment handler
├── hooks/
│   ├── useResearch.ts            # Research workflow state & streaming
│   └── useSynthesizer.ts         # Synthesis state management
├── lib/
│   ├── agents/
│   │   ├── researchers.ts        # Researcher agent logic
│   │   └── synthesizer.ts        # Synthesizer agent logic
│   ├── clients/
│   │   └── google.ts             # Google Gemini client config
│   ├── prompts/
│   │   ├── personas/             # Agent persona definitions
│   │   │   ├── researchers.ts    # 3 researcher personas
│   │   │   ├── synthesizer.ts    # Synthesizer prompt
│   │   │   ├── reviewer.ts       # Review logic
│   │   │   └── synthesizerClarifier.ts
│   │   └── index.ts              # Prompt exports
│   ├── tool-call/
│   │   ├── supabase-client.ts    # Supabase integration
│   │   └── tools.ts              # Tool definitions
│   └── utils.ts                  # Utility functions
├── types/
│   ├── researcher.types.ts       # Researcher type definitions
│   ├── synthesizer.types.ts      # Synthesizer type definitions
│   └── supabase.ts               # Supabase database types
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### POST `/api/researchers`

Runs the multi-agent research workflow with 3 phases (initial → feedback → final).

**Request:**

```json
{
  "conversation": "string (required)",
  "researcherIds": ["researcherA", "researcherB", "researcherC"],
  "cycle": 1
}
```

**Response:** JSON Lines stream

```json
{"type":"result","payload":{"status":"fulfilled","cycle":1,"phase":"initial","phasePosition":1,"result":{...}}}
{"type":"phaseComplete","cycle":1,"phase":"initial"}
{"type":"complete","cycle":1}
```

### POST `/api/synthesizer`

Synthesizes researcher responses or clarifies initial questions.

**Request (Synthesis):**

```json
{
  "conversation": "string",
  "researcherResponses": [
    {
      "researcherId": "researcherA",
      "answer": "...",
      "confidenceScore": 0.85
    }
  ],
  "cycle": 1,
  "mode": "synthesis"
}
```

**Request (Clarification):**

```json
{
  "conversation": "string",
  "mode": "clarify"
}
```

**Response:**

```json
{
  "status": "fulfilled",
  "result": {
    "summary": "...",
    "mediatorNotes": "...",
    "highlights": [{ "title": "...", "detail": "..." }],
    "followUpQuestion": "...",
    "rawText": "..."
  },
  "cycle": 1,
  "mode": "synthesis"
}
```

### POST `/api/summarize`

Normalizes and summarizes user input before research begins.

**Request:**

```json
{
  "messages": [
    {
      "role": "user",
      "parts": [
        { "type": "text", "text": "..." },
        { "type": "file", "data": "base64...", "mimeType": "..." }
      ]
    }
  ]
}
```

### POST `/api/chat`

Standard streaming chat interface endpoint.

## How It Works

### Research Workflow

1. **User Input**

   - User submits conversation or question
   - Optional file attachments (PDFs, images, etc.)
   - Input is normalized via summarization

2. **Clarification Phase (Cycle 0)**

   - Synthesizer clarifies the question
   - Provides context and suggests initial follow-ups
   - Helps refine research direction

3. **Cycle 1: Primary Analysis**

   - **Initial Phase**: All 3 researchers analyze independently
   - **Feedback Phase**: Researchers critique peers; highest confidence advances
   - **Final Phase**: Other researchers respond to winner's critique
   - **Synthesis**: Mediator combines insights and generates follow-up

4. **Cycles 2-3: Follow-up Analysis**

   - Synthesizer's follow-up question becomes new conversation
   - Same 3-phase workflow repeats
   - Each cycle deepens understanding

5. **Output**
   - Comprehensive synthesis of all perspectives
   - Highlighted key insights and tensions
   - Actionable next steps

### Confidence Scoring

Each researcher response includes a confidence score (0.0-1.0):

- **1.0**: Fully supported by robust data
- **0.8-0.99**: Mostly supported, minor uncertainties
- **0.6-0.79**: Moderately supported, several assumptions
- **0.4-0.59**: Weak support, heavy assumptions
- **0.2-0.39**: Very weak, mostly speculative
- **0.0-0.19**: Purely hypothetical

Scores consider:

- Evidence grounding
- Logical robustness
- Domain alignment
- Uncertainty awareness

## UI Modes

### Playground Mode (Default)

**Focus View** - Slide through stages sequentially:

- Input stage
- Clarifier stage
- Each cycle's analysis and synthesis

**Timeline View** - Horizontal scrollable view:

- All stages visible side-by-side
- Color-coded status (done, in-progress, upcoming)
- Detailed cards for each researcher and synthesizer

### Chat Mode

Traditional chat interface with file attachments and streaming responses.

## Configuration

### Researcher Personas

Edit `lib/prompts/personas/researchers.ts` to customize:

- Persona descriptions
- Analysis focus areas
- Response guidelines

### Synthesizer Behavior

Edit `lib/prompts/personas/synthesizer.ts` to adjust:

- Synthesis strategy
- Mediation approach
- Follow-up question generation

### AI Model Settings

Edit `lib/clients/google.ts` to configure:

- Model selection (currently Gemini Flash)
- Temperature, top-p, top-k
- Safety settings
- Thinking tokens (extended_thinking)

## Development

### Type Generation

Generate Supabase types:

```bash
npm run generate:supabase-types
```

### Adding New Researchers

1. Add new persona to `lib/prompts/personas/researchers.ts`
2. Update `ResearcherId` type in `types/researcher.types.ts`
3. Persona automatically available in workflow

### Customizing Synthesis

Modify `lib/prompts/personas/synthesizer.ts` to change:

- Summary format
- Highlight extraction logic
- Follow-up question generation

## Production Deployment

1. Build the application:

```bash
npm run build
```

2. Set environment variables in production
3. Deploy to Vercel, AWS, or your preferred platform
4. Ensure API keys are securely configured

## Environment Variables

Required:

- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key

Optional:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## License

This project is private and proprietary.

## Contributing

This is a research project. Contact the maintainer for contribution guidelines.
