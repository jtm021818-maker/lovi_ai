# 🧠 루나(Luna) AI 이중뇌 아키텍처 다이어그램

루나 상담 시스템이 사용자의 메시지를 받고, 좌뇌(분석)와 우뇌(공감)를 거쳐 최종적으로 화면에 텍스트와 이펙트를 띄워주기까지의 전체 흐름도입니다.

```mermaid
flowchart TD
    %% 스타일 정의
    classDef user fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef leftBrain fill:#e6f3ff,stroke:#0066cc,stroke-width:2px;
    classDef rightBrain fill:#fff3e6,stroke:#cc6600,stroke-width:2px;
    classDef eye fill:#f0e6ff,stroke:#6600cc,stroke-width:2px;
    classDef system fill:#f0f0f0,stroke:#666,stroke-width:1px;

    %% 노드 정의
    A(["🗣️ 사용자 메시지 입력"]) ::: user
    
    subgraph DataLoad ["사전 준비 (DB)"]
        B["세션 정보 및 과거 요약 병렬 로드"] ::: system
    end

    A --> B
    
    %% 좌뇌 (분석)
    subgraph LeftBrain ["🧠 좌뇌: 상태 분석 엔진 (Gemini 2.5 Flash Lite)"]
        C["텍스트 의도 및 맥락 파악"] ::: leftBrain
        D["5축 분석 지표 추출\n(감정 점수, 리스크 레벨, 친밀도 등)"] ::: leftBrain
        E[/"📄 JSON 진단서 생성"/] ::: leftBrain
        C --> D --> E
    end

    B --> C

    %% 라우팅 로직
    subgraph Router ["🔀 스마트 라우터 (복잡도/비용 분기)"]
        F{"리스크(Risk) 검사 \n& 심리 전략 검토"} ::: system
        F -- "HIGH (위기/우울)\n또는 깊은 상담" --> G["[1순위] Claude Sonnet 4.6"] ::: system
        F -- "LOW (일상/가벼운 넋두리)\n또는 단순 대화" --> H["[1순위] Gemini 2.5 Flash Lite"] ::: system
    end

    E --> F

    %% 우뇌 (공감)
    subgraph RightBrain ["🦊 우뇌: 공감/표현 엔진 (Human-Like ACE)"]
        I["프롬프트 동기화\n(좌뇌 JSON + 루나 페르소나 + 관계 그래프)"] ::: rightBrain
        J["K-Casual 구어체 \n스트리밍 답변 생성"] ::: rightBrain
        K[/"💬 다정한 텍스트 답변 출력"/] ::: rightBrain
        
        G --> I
        H --> I
        I --> J --> K
    end

    %% 제3의눈 (이벤트)
    subgraph ThirdEye ["✨ 제3의 눈: 시각적 환기 (Gemini 2.5)"]
        L{"감정 임계점 도달?\n(또는 턴수 분기)"} ::: system
        M["Visual Novel 이벤트 트리거\n(감정 온도계, 거울 등)"] ::: eye
        N[/"🎨 UI 이펙트 발동"/] ::: eye
        
        E -.-> L
        L -- "Yes" --> M --> N
        L -- "No" --> O["트리거 안함"] ::: system
    end
    
    K --> P(["📱 사용자 화면에 출력 (Streaming)"]) ::: user
    N -.-> P
    
    %% 후처리
    P --> Q["세션 상태 DB에 통합 UPDATE"] ::: system

```

## 🔍 아키텍처 핵심 포인트 가이드

1. **완벽한 분업**:
   - `🧠 좌뇌`는 가장 싸고 빠르고 분석을 잘하는 **Gemini 2.5 Flash Lite**가 전담하여 무조건 JSON 형태의 진단서만 뽑아냅니다. 절대 유저에게 직접 말을 걸지 않습니다.
   - `🦊 우뇌`는 진단서를 넘겨받아 '말하는 척' 연기만 합니다.

2. **똑똑한 비용 절감 (스마트 라우터)**:
   - 좌뇌가 뱉어낸 JSON의 `Risk Level`이 높거나, 깊은 상담이 필요할 때만 비싼 **Claude**를 우뇌로 호출합니다.
   - 그냥 심심해서 말 건 일상 대화라면 굳이 Claude를 부르지 않고, 가성비 최고인 **Gemini Flash Lite**가 우뇌 역할까지 혼자 다 해냅니다.

3. **이벤트 비동기 발동 (시각적 환기)**:
   - 우뇌가 텍스트를 스트리밍하는 동안, `✨ 제3의 눈`은 뒤에서 조용히 대기하다가 감정 게이지가 찼다고 판단될 때 백그라운드 UI(배경색 변화, 캐릭터 표정 등장)를 실시간으로 조작 명령을 내립니다.
