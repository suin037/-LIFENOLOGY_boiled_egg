from domain_router import DOMAIN_LABELS, route_domains


def test_all_nine_domains_share_one_contract():
    routed = route_domains(list(DOMAIN_LABELS), {"age": 29, "sex": "2", "major": "공학"})

    assert set(routed) == set(DOMAIN_LABELS)
    for key, outcome in routed.items():
        assert outcome["domain"] == key
        assert outcome["status"] in {"available", "unavailable"}
        assert outcome["evidence"] in {"model", "group_stat", "rag", "insufficient"}
        assert isinstance(outcome["indicators"], list)
        assert "claim_type" in outcome
        assert "limitation" in outcome


def test_business_domain_uses_each_choice_detail():
    cafe = route_domains(["business"], {"age": 29}, "1인 카페 창업")["business"]
    software = route_domains(["business"], {"age": 29}, "직원 7명 IT 소프트웨어 창업")["business"]

    assert cafe["status"] == "available"
    assert software["status"] == "available"
    assert cafe["indicators"][0]["value"] != software["indicators"][0]["value"]
    assert "숙박 및 음식점업" in cafe["indicators"][0]["note"]
    assert "정보통신업" in software["indicators"][0]["note"]
