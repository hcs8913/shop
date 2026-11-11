# FANS SHOP 굿즈 점검 기준

사용자는 FANS SHOP을 자주 이용하며, 앞으로도 다음 방식으로 점검하기를 요청했다.

- 목록 화면의 SOLD OUT 표시만으로 점검을 끝내지 않는다. 대상 상품 전체의 상세 페이지와 멤버·캐릭터·색상·사이즈 등 모든 옵션의 품절 상태를 확인한다.
- Playwright 접속 시 일반 브라우저 User-Agent와 ko-KR locale을 명시한다. 자동화 기본 User-Agent에서는 script가 없는 정적 HTML이 반환되어 상품 클릭과 옵션 확인이 작동하지 않을 수 있다. 클릭이 작동하지 않는 것을 품절 없음으로 해석하지 않는다.
- 검증된 User-Agent 예: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36
- 실제 페이지의 GraphQL 요청을 관찰하여 상품 링크와 상세 옵션을 수집할 수 있다. 행사 페이지의 ShopPromotionSections 응답에서 product.globalProduct.slug를 얻고, GlobalProduct 요청으로 상세 데이터를 확인한다. 상세 주소 형식은 https://app.fans/shop/i/product/{slug}?mp=KR 이다.
- 한국 판매 기준이면 marketplace.category가 KR인 product를 선택하고 variants 각각의 isOutOfStock을 확인한다. 상품 전체 isOutOfStock과 옵션별 isOutOfStock은 구분한다. 로그인 필요로 canPurchase가 false인 상태는 품절 근거가 아니다.
- 요청 형식과 필드는 실제 사이트 요청으로 검증한다. 이전 실행의 JSON과 품절 결과를 현재 재고로 재사용하지 않는다.
- 현재 데이터 수집 실패, 페이지 누락, 옵션 누락은 미확인으로 보고한다. 전체 상품 수·옵션 수와 전체 품절/부분 품절을 구분해 기록한다.
- 우리 사이트 재고 변경을 요청받으면 상품명·바코드·옵션명으로 동일 품목을 대조한다. 품절이 확인된 옵션만 0으로 변경하고, 판매 가능한 옵션은 유지한다. 변경 전 백업과 변경 후 재조회 검증을 수행한다. 활성 상태 변경은 별도 요청이 없는 한 하지 않는다.
- 중단 지시 이후에는 추가 변경하지 않는다. 방법 조사나 확인만 요청한 경우 재고를 변경하지 않는다.
- 계정 비밀번호, 쿠키 및 토큰을 이 문서나 저장소에 기록하지 않는다.

구현 참고: fans-options-live.mjs, fans-options-promotion.mjs, fans-options-audit.mjs. 이 파일들은 특정 실행 경로와 행사 주소가 포함된 예시이므로 새 점검에 맞게 조정한다.
