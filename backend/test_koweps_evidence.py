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
