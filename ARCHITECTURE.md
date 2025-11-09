# Multi-Agent 논문 요약 서비스 아키텍처

## 폴더 구조

```
reasoning-research-agent/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   └── summarize/            # 논문 요약 API 엔드포인트
│   │       └── route.ts
│   ├── components/               # React 컴포넌트 (추가 예정)
│   ├── page.tsx                  # 메인 페이지
│   └── layout.tsx                # 레이아웃
│
├── lib/                          # 핵심 비즈니스 로직
│   ├── agents/                   # AI Agent 구현
│   │   ├── base/                 # Base Agent 클래스
│   │   │   └── index.ts
│   │   ├── personas/             # Persona별 Agent 구현
│   │   │   ├── summarizer.ts     # 요약 Agent
│   │   │   ├── analyzer.ts       # 분석 Agent
│   │   │   └── critic.ts         # 비판적 검토 Agent
│   │   └── index.ts              # Agent 모듈 진입점
│   │
│   ├── prompts/                  # 프롬프트 템플릿
│   │   ├── personas/             # Persona별 프롬프트
│   │   │   ├── summarizer.ts
│   │   │   ├── analyzer.ts
│   │   │   └── critic.ts
│   │   └── index.ts
│   │
│   ├── flows/                    # Flow 오케스트레이션
│   │   ├── orchestrator.ts       # Flow 실행 엔진
│   │   ├── pipeline.ts           # 프리빌트된 Flow 정의
│   │   └── index.ts
│   │
│   ├── services/                 # 외부 서비스 통합
│   │   ├── llm-service.ts        # LLM API 서비스
│   │   ├── paper-service.ts      # 논문 파싱 서비스
│   │   └── index.ts
│   │
│   ├── types/                    # TypeScript 타입 정의
│   │   ├── agent.ts              # Agent 관련 타입
│   │   ├── flow.ts               # Flow 관련 타입
│   │   └── index.ts              # 공통 타입
│   │
│   ├── utils/                    # 유틸리티 함수
│   │   ├── parser.ts             # 텍스트 파싱 유틸
│   │   ├── validator.ts          # 검증 유틸
│   │   └── index.ts
│   │
│   └── index.ts                  # 라이브러리 진입점
│
└── [기타 Next.js 파일들]
```

## 핵심 컴포넌트

### 1. Agents (`lib/agents/`)

- **BaseAgent**: 모든 Agent의 기본 클래스
- **Persona Agents**: 특정 역할을 가진 Agent 구현
  - `SummarizerAgent`: 논문 요약
  - `AnalyzerAgent`: 논문 분석
  - `CriticAgent`: 비판적 검토

### 2. Prompts (`lib/prompts/`)

- Persona별 프롬프트 템플릿 관리
- 다양한 요약/분석 스타일 지원

### 3. Flows (`lib/flows/`)

- **FlowOrchestrator**: Agent들을 조율하는 엔진
- **Pipeline**: 프리빌트된 Flow 정의
  - Sequential Flow: 순차 실행
  - Parallel Flow: 병렬 실행
  - Conditional Flow: 조건부 실행

### 4. Services (`lib/services/`)

- **LLMService**: LLM API 호출
- **PaperService**: 논문 파싱 및 처리

### 5. Types (`lib/types/`)

- 타입 안정성을 위한 TypeScript 타입 정의

## Flow 실행 흐름

1. **API 요청 수신** (`app/api/summarize/route.ts`)
2. **입력 검증** (Paper, Prompt 검증)
3. **Flow 선택** (기본 또는 사용자 정의)
4. **Agent 생성 및 등록**
5. **Flow 실행** (Orchestrator)
6. **결과 반환**

## 확장 가능성

### 새로운 Agent 추가

1. `lib/agents/personas/`에 새 Agent 클래스 생성
2. `lib/agents/index.ts`에 등록
3. `lib/prompts/personas/`에 프롬프트 추가

### 새로운 Flow 추가

1. `lib/flows/pipeline.ts`에 Flow 정의 추가
2. 필요시 `FlowOrchestrator` 확장

### 새로운 서비스 추가

1. `lib/services/`에 새 서비스 클래스 생성
2. 필요한 경우 Agent에서 사용

## 사용 예시

```typescript
// API 호출 예시
POST /api/summarize
{
  "paper": {
    "title": "Paper Title",
    "content": "Paper content...",
    "authors": ["Author 1", "Author 2"]
  },
  "prompt": "Summarize this paper",
  "personas": ["summarizer", "analyzer", "critic"],
  "flowType": "sequential"
}
```

## 다음 단계

1. LLM Service 구현 (OpenAI, Anthropic 등)
2. Paper Service 구현 (PDF 파싱, ArXiv 연동)
3. UI 컴포넌트 개발
4. 에러 핸들링 강화
5. 로깅 및 모니터링 추가
6. 테스트 코드 작성
