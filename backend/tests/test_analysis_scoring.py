import re

import pytest

from app.analysis import scoring
from app.schemas import AnalysisResult

ARTICLE_OUTPUT = {
    "stanceLabel": "Disagrees",
    "stanceConfidence": 0.8,
    "sensationalismScore": 72,
    "summary": "  The headline   promises a scandal the body does not support. ",
    "highlights": [
        {"token": "SHOCKING", "kind": "hyperbole", "weight": 0.9},
        {"token": "destroyed", "kind": "emotional", "weight": 1.4},
        {"token": "nowhere-in-text", "kind": "clickbait", "weight": 0.5},
        {"token": "council", "kind": "not-a-kind", "weight": 0.5},
    ],
}


@pytest.mark.parametrize(
    ("score", "level"),
    [(0, "low"), (33, "low"), (34, "medium"), (66, "medium"), (67, "high"), (100, "high")],
)
def test_risk_level_thresholds(score, level):
    assert scoring.risk_level(score) == level


def test_clamp_score_rounds_half_up_and_clamps():
    assert scoring.clamp_score(42.5) == 43
    assert scoring.clamp_score(-7) == 0
    assert scoring.clamp_score(140) == 100


@pytest.mark.parametrize(
    ("stance", "confidence", "expected"),
    [
        ("Agrees", 1.0, 5),
        ("Disagrees", 1.0, 95),
        ("Unrelated", 1.0, 80),
        ("Discusses", 1.0, 35),
        ("Agrees", 0.0, 30),
        ("Disagrees", 0.5, 63),  # 95*0.5 + 30*0.5 = 62.5 -> 63
        ("Agrees", 1.7, 5),  # confidence is clamped to 1
    ],
)
def test_mismatch_formula(stance, confidence, expected):
    assert scoring.mismatch_score(stance, confidence) == expected


def test_risk_formulas():
    assert scoring.article_risk_score(80, 20) == 56  # 0.6*80 + 0.4*20
    assert scoring.article_risk_score(20, 80) == 56  # order does not matter
    assert scoring.video_risk_score(60, 40) == 53  # 0.65*60 + 0.35*40 = 53


def test_excerpt_is_capped_at_sixty_words():
    body = " ".join(f"w{i}" for i in range(100))
    excerpt = scoring.build_excerpt("Big   news\ttoday", body)
    words = excerpt.split()
    assert len(words) == 60
    assert words[:3] == ["Big", "news", "today"]


def test_highlights_match_ignoring_case_and_punctuation():
    excerpt = 'SHOCKING: Council "destroyed" the plan, critics say.'
    highlights = scoring.match_highlights(
        excerpt,
        [
            {"token": "shocking", "kind": "hyperbole", "weight": 0.9},
            {"token": "Destroyed!", "kind": "emotional", "weight": 0.7},
        ],
    )
    assert highlights == [
        {"tokenIndex": 0, "token": "SHOCKING", "weight": 0.9, "kind": "hyperbole"},
        {"tokenIndex": 2, "token": "destroyed", "weight": 0.7, "kind": "emotional"},
    ]


def test_highlights_drop_unmatched_and_unknown_kinds():
    highlights = scoring.match_highlights("calm words only", [
        {"token": "missing", "kind": "hyperbole", "weight": 0.5},
        {"token": "calm", "kind": "sarcasm", "weight": 0.5},
    ])
    assert highlights == []


def test_repeated_token_uses_next_occurrence():
    highlights = scoring.match_highlights("huge huge deal", [
        {"token": "huge", "kind": "hyperbole", "weight": 0.5},
        {"token": "HUGE", "kind": "hyperbole", "weight": 0.4},
        {"token": "huge", "kind": "hyperbole", "weight": 0.3},
    ])
    assert [h["tokenIndex"] for h in highlights] == [0, 1]


def test_multi_word_highlight_marks_each_word():
    highlights = scoring.match_highlights("You won't believe this", [
        {"token": "won’t believe", "kind": "clickbait", "weight": 0.8},
    ])
    assert [(h["tokenIndex"], h["token"]) for h in highlights] == [(1, "won't"), (2, "believe")]


def test_highlights_keep_the_twelve_strongest_in_reading_order():
    excerpt = " ".join(f"word{i}" for i in range(20))
    raw = [{"token": f"word{i}", "kind": "emotional", "weight": i / 20} for i in range(20)]
    highlights = scoring.match_highlights(excerpt, raw)
    assert [h["tokenIndex"] for h in highlights] == list(range(8, 20))


def test_source_hostname_strips_www():
    assert scoring.source_hostname("https://www.BBC.co.uk/news/1") == "bbc.co.uk"
    assert scoring.source_hostname("not a url") == ""


def test_build_article_result_matches_contract():
    headline = "SHOCKING report: council destroyed libraries"
    body = "The council voted to close three libraries. " * 20
    result = scoring.build_article_result("https://www.example.com/a", headline, body, ARTICLE_OUTPUT)

    assert re.fullmatch(r"res_[0-9a-f]{8}", result["id"])
    assert re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z", result["analyzedAt"])
    assert result["source"] == "example.com"
    assert result["isMock"] is False
    assert [g["key"] for g in result["gauges"]] == ["sensationalism", "mismatch"]
    assert [g["label"] for g in result["gauges"]] == ["Sensationalism", "Headline mismatch"]
    assert result["gauges"][1]["value"] == 82  # 95*0.8 + 30*0.2
    assert result["riskScore"] == 78  # 0.6*82 + 0.4*72 = 78
    assert result["riskLevel"] == "high"
    assert result["article"] == {"stanceLabel": "Disagrees", "stanceConfidence": 0.8, "sensationalismScore": 72}
    assert result["summary"] == "The headline promises a scandal the body does not support."
    assert [(h["token"], h["weight"]) for h in result["highlights"]] == [("SHOCKING", 0.9), ("destroyed", 1.0)]
    words = result["excerpt"].split()
    assert all(words[h["tokenIndex"]].strip(":") == h["token"] for h in result["highlights"])
    AnalysisResult.model_validate(result)


def test_build_video_result_matches_contract():
    output = {"baitSwitchScore": 70, "titleHype": 90, "summary": "Big promise.", "highlights": [
        {"token": "INSANE", "kind": "hyperbole", "weight": 0.9},
    ]}
    thumb = "https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg"
    result = scoring.build_video_result("https://www.youtube.com/watch?v=abcdefghijk", "abcdefghijk",
                                        "This is  INSANE!", thumb, output)

    assert result["contentType"] == "video"
    assert result["excerpt"] == "This is INSANE!"
    assert [g["key"] for g in result["gauges"]] == ["baitSwitch", "titleHype"]
    assert [g["label"] for g in result["gauges"]] == ["Bait-and-switch", "Title hype"]
    assert result["riskScore"] == 77  # 0.65*70 + 0.35*90 = 77
    assert result["video"] == {"videoId": "abcdefghijk", "thumbnailUrl": thumb, "baitSwitchScore": 70}
    assert result["highlights"] == [{"tokenIndex": 2, "token": "INSANE", "weight": 0.9, "kind": "hyperbole"}]
    assert "article" not in result
    AnalysisResult.model_validate(result)
