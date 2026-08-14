from koweps_evidence import evidence_for_request, indicator_statuses


def test_move_evidence_is_available_and_observational():
    result = evidence_for_request({"choice_a": "현재 집 유지", "choice_b": "서울로 이사"})
    assert result["available"] is True
    assert result["scenario"] == "housing.move"
    assert result["evidence_level"] == "observed_group"
    assert result["event_people"] > 1000


def test_unsupported_generic_health_choice_does_not_invent_evidence():
    result = evidence_for_request({"choice_a": "건강", "choice_b": "회복"})
    assert result["available"] is False


def test_marriage_evidence_maps_event_and_comparison_to_ab_choices():
    result = evidence_for_request({
        "choice_a": "미혼 유지",
        "choice_b": "결혼",
        "choice_a_domains": ["relationship"],
        "choice_b_domains": ["relationship"],
    })
    assert result["available"] is True
    assert result["scenario"] == "relationship.marriage_start"
    assert result["event_side"] == "B"
    assert result["comparison_side"] == "A"
    assert {outcome["key"] for outcome in result["outcomes"]} >= {
        "disposable_income", "family_satisfaction", "overall_satisfaction",
    }
    assert result["indicator_mapping"]["경제적안정도"]["strength"] == "direct"
    assert result["indicator_mapping"]["성장가능성"]["strength"] == "proxy"
    assert result["indicator_mapping"]["삶의질"]["strength"] == "direct"
    statuses = indicator_statuses(result, "B")
    assert statuses["경제적안정도"]["status"] == "observed_group"
    assert statuses["성장가능성"]["status"] == "proxy_observation"
    assert statuses["삶의질"]["status"] == "observed_group"


def test_startup_uses_official_employment_transition_and_maps_quality_of_life():
    result = evidence_for_request({
        "choice_a": "임금근로 유지",
        "choice_b": "1인 카페 창업",
        "choice_a_domains": ["career"],
        "choice_b_domains": ["business"],
    })
    assert result["available"] is True
    assert result["scenario"] == "business.self_employment_start"
    assert result["event_side"] == "B"
    assert result["event_people"] == 308
    statuses = indicator_statuses(result, "B")
    assert statuses["경제적안정도"]["status"] == "observed_group"
    assert statuses["성장가능성"]["status"] == "proxy_observation"
    assert statuses["삶의질"]["status"] == "observed_group"


def test_profile_returns_personalized_matched_observation_without_diary_score_adjustment():
    result = evidence_for_request({
        "choice_a": "미혼 유지",
        "choice_b": "결혼",
        "profile": {
            "age": 29, "sex": "2", "edu_level": 7,
            "monthly_wage": 280, "occupation_group": 3,
            "employment_status": 1,
        },
        "diary": "요즘 결혼이 걱정되지만 관계와 안정이 중요하다",
    })
    assert result["available"] is True
    assert result["evidence_level"] == "personalized_matched_observation"
    assert result["personalization"]["event_sample_n"] >= 40
    assert result["personalization"]["comparison_sample_n"] >= 40
    assert "나이" in result["personalization"]["applied_features"]
    assert "일기 성향은 결과 수치를 바꾸지 않고" in result["personalization"]["diary_policy"]
    statuses = indicator_statuses(result, "B")
    assert statuses["경제적안정도"]["status"] == "matched_observation"


def test_finance_and_lifestyle_choices_route_to_concrete_events():
    savings = evidence_for_request({"choice_a": "적금 유지", "choice_b": "저축 늘리기"})
    hours = evidence_for_request({"choice_a": "현재 근무 유지", "choice_b": "근로시간 줄이기"})
    assert savings["scenario"] == "finance.savings_increase"
    assert hours["scenario"] == "lifestyle.work_hours_decrease"
    assert "installment_savings" in {item["key"] for item in savings["outcomes"]}
    assert "weekly_work_hours" in {item["key"] for item in hours["outcomes"]}
