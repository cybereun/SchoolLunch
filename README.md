# 🍱 오늘의 급식알리미 (School Lunch Alerter)

![Platform](https://img.shields.io/badge/Platform-Web%20%2F%20PWA-F43F5E?style=flat-square)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square)
![React](https://img.shields.io/badge/Framework-React%2018-61DAFB?style=flat-square)
![Vite](https://img.shields.io/badge/Build%20Tool-Vite-646CFF?style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

> **전국 초·중·고등학교의 급식 식단과 상세 영양 분석을 한눈에!**  
> 모바일 최적화 화면과 최애 메뉴 등록, 그리고 정밀 알레르기 안내 시스템을 갖춘 스마트 급식알리미 웹앱입니다.

---

## ✨ 핵심 특징 (Features)

1. **전국 학교 검색 및 연동 (NEIS API)**
   - 교육부 나이스(NEIS) 오픈 API 실시간 동기화로 전국 초·중·고등학교 급식 정보를 정확하게 가져옵니다.
   - 프록시 서버 연동 및 네트워크 환경이 불안정할 경우 브라우저 직접 통신(Client-side Fallback) 이중화 구조를 적용하여 장애를 최소화합니다.

2. **최애 메뉴 & 알레르기 안심 등록**
   - 좋아하는 반찬 키워드(예: `치킨`, `고기`, `돈까스`)를 등록하면 식단표에 별표(★)와 하이라이트가 표시됩니다.
   - 개인 맞춤형 알레르기 유발 물질 정보(19가지 종류)를 설정하면, 해당 성분이 포함된 메뉴에 명확한 경고와 아이콘이 부각되어 안전한 식사를 돕습니다.

3. **정밀 영양 성분 & 3대 영양소 분석**
   - 식습관 관리에 필수적인 한 끼당 총 열량(kcal)과 탄수화물, 단백질, 지방 등 정밀 분석표를 카드 UI 기반으로 제공합니다.
   - 모바일 등 다양한 해상도의 기기에서 가독성이 좋게 디자인이 자동 최적화됩니다.

4. **오프라인 캐싱 및 빠른 로딩**
   - 조회한 데이터는 로컬 스토리지에 자동 암전 캐싱 처리되어, 데이터를 다시 불러올 필요 없이 즉각 실행됩니다.

5. **카카오톡 & SNS 공유 카드 최적화**
   - 주소를 카카오톡, 라인 등으로 공유 시 예쁜 카드명함 형태의 미리보기(Open Graph 메타태그)가 적용됩니다.

6. **다국어 자동 번역 방지**
   - 모바일 브라우저나 스마트폰 자체에서 한글 급식 메뉴를 이상하게 오역하는 현상을 완벽하게 방지하도록 독립 번역 금지(`notranslate`) 설정이 적용되어 있습니다.

---

## 📱 앱 설치 방법 (How to Install PWA)

본 애플리케이션은 **프로그레시브 웹 앱(PWA)** 기술이 완벽히 적용되어 스마트폰에 네이티브 앱처럼 설치하여 바로가기 아이콘으로 사용할 수 있습니다.

### 🍏 iOS (iPhone, iPad)
1. **Safari** 브라우저 주소창에 본 서비스 URL을 입력하여 접속합니다.
2. 하단의 **'공유하기(내보내기)'** 버튼을 누릅니다.
3. 메뉴 중 **'홈 화면에 추가'**를 선택합니다.
4. 홈 화면에 생성된 예쁜 급식판 모양의 **'급식알리미'** 아이콘을 눌러 사용합니다.

### 🤖 Android (Galaxy, LG 등)
1. **Chrome** 또는 **삼성 인터넷** 브라우저로 서비스 URL에 접속합니다.
2. 우측 상단의 점 3개 메뉴나 하단 바에서 **'앱 웹 설치'** 또는 **'홈 화면에 추가'**를 선택합니다.
3. 앱 설치 안내가 나오면 설치를 진행합니다. 홈 화면과 앱 서랍에 생성된 아이콘을 터치하여 네이티브 앱처럼 편리하게 이용할 수 있습니다.

---

## 🛠️ 개발 기술 스택 및 환경 실행 방법

- **Frontend**: React 18 (TypeScript), Vite, Tailwind CSS, Motion (Framer Motion)
- **Backend / Utility**: TypeScript (tsx), Express Node.js

### 로컬 개발 서버 실행 방법

1. **의존성 패키지 설치**
   ```bash
   npm install
   ```

2. **개발 모드 기동**
   ```bash
   npm run dev
   ```
   브라우저에서 `http://localhost:3000`으로 접속합니다.

3. **프로덕션 빌드**
   ```bash
   npm run build
   ```

4. **프로덕션 서버 시작**
   ```bash
   npm run start
   ```

---

## 🚀 버전 업데이트 특징 (Version Updates Changelog)

### v1.2.0 (최신 업데이트)
- 📌 **카카오톡 오픈그래프 최적화**: 단톡방이나 개인 메시지로 링크 공유 시 카드명함 형태의 귀여운 썸네일과 식단 정보 요약 카드가 뜨도록 메타데이터 개선.
- 🎨 **PWA 홈 화면 설치 지원 및 커스텀 아이콘 등록**: 식판과 딸기우유, 밥뎡이를 담은 고해상도 벡터 일러스트 스퀴클 아이콘(`icon.svg`) 및 `manifest.json` 적용.
- 🌐 **모바일 자동 번역 버그 수정**: 스마트폰 기기 자체 번역 기능 등으로 인해 '탄수화물', '단백질', '지방' 등 영양소 명칭이나 한글 메뉴명이 뜻이 어색하게 강제 번역 및 깨지는 현상을 `notranslate` 및 `lang="ko"` 지정을 통해 전면 방지.
- 💻 **정밀 영양소 분석 모바일 레이아웃 조정**: 아주 좁은 화면의 폰에서도 글자 무너짐 없이 모바일 화면 밀도에 반응하도록 디스플레이 정렬 최적화.

---

## ✍️ 개발자 정보 (Developer Information)

- **Developer**: **cybereun**  
- **Contact**: cybereunny@gmail.com  
- **Copyright**: © 2026 School Lunch Menu · by cybereun. All Rights Reserved.
